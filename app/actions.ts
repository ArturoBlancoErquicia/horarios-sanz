'use server';

import { findSubstitutes } from '@/lib/logic';
import { createSchedule, getEmployeesByStore, getAllEmployees } from '@/lib/data'; // Need to export these valid functions
import { revalidatePath } from 'next/cache';
import { format } from 'date-fns';

export async function getSubstitutes(dateStr: string) {
    // Default time range (full day) as the logic currently marks anyone working that day as busy.
    // We can refine this later to specific hours if needed.
    const start = '00:00';
    const end = '23:59';

    // storeId is not really used in the exclusion logic of findSubstitutes (it gets all employees and excludes busy ones),
    // but the signature requires it. We can pass 0 or any ID.
    const storeId = 0;

    try {
        const substitutes = findSubstitutes(storeId, dateStr, start, end);
        return { success: true, data: substitutes };
    } catch (error) {
        console.error('Error finding substitutes:', error);
        return { success: false, error: 'Failed to find substitutes' };
    }
}

export async function assignSubstitute(employeeId: number, substituteId: number, dateStr: string) {
    try {
        const allEmployees = getAllEmployees();
        const employee = allEmployees.find(e => e.id === employeeId);
        const substitute = allEmployees.find(e => e.id === substituteId);

        if (!employee || !substitute) {
            throw new Error('Employee or Substitute not found');
        }

        // 1. Mark original employee as Absent
        // We need to know the time of the shift. For now, let's assume full day or standard store hours.
        // Since logic.ts calculates exact times, we might want to just mark "absence" for the whole day
        // and let logic.ts just exclude them. Start/End times in DB are useful for display/conflict checks.
        // Let's use generic times for now or fetch store hours.

        createSchedule({
            employee_id: employee.id,
            store_id: employee.store_id, // Absence is at their home store (or where they were scheduled)
            date: dateStr,
            start_time: '00:00',
            end_time: '23:59', // Full day absence
            type: 'absence'
        });

        // 2. Assign Substitute (Reinforcement)
        // They effectively take the shift.
        // Logic.ts `extraSchedules` loop will use the start/end time from this record.
        // We should ideally copy the time the original employee WOULD have worked.
        // But logic.ts generates that on the fly.
        // For simplicity, let's assign a "standard" shift time or match the store hours.
        // OR, we can just use 00:00-23:59 and rely on the type being 'work'/'reinforcement' which logic.ts just displays.
        // Better: logic.ts logic for displaying extra schedules uses the time in the DB record.
        // So we should put a realistic time. e.g. "To Be Defined" or look up store hours.
        // Let's default to "Turno Sustitución" or similar text if possible? No, time field is string.
        // Let's use "08:00" - "15:00" as a generic placeholder, or try to be smarter.
        // For now: "00:00" - "00:00" might look weird.
        // Let's use a generic 8h shift text? No, it expects HH:MM.
        // Let's use 6:30 - 14:30 (common start).

        createSchedule({
            employee_id: substitute.id,
            store_id: employee.store_id, // They work at the ORIGINAL employee's store
            date: dateStr,
            start_time: '06:30', // Default start
            end_time: '14:30',   // Default end
            type: 'reinforcement'
        });

        revalidatePath(`/store/${employee.store_id}`);
        return { success: true };
    } catch (error) {
        console.error('Error assigning substitute:', error);
        return { success: false, error: 'Failed to assign substitute' };
    }
}
