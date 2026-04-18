'use server';

import { findSubstitutes, checkWeeklyHours, detectConflicts } from '@/lib/logic';
import { createSchedule, getEmployeesByStore, getAllEmployees, getStoreById, updateSchedule, deleteSchedule } from '@/lib/data';
import { revalidatePath } from 'next/cache';

// --- Substitutes ---

export async function getSubstitutes(dateStr: string) {
    try {
        const substitutes = findSubstitutes(0, dateStr, '00:00', '23:59');
        return { success: true, data: substitutes };
    } catch (error) {
        console.error('Error finding substitutes:', error);
        return { success: false, error: 'Failed to find substitutes' };
    }
}

export async function getStoreEmployees(storeId: number) {
    return getEmployeesByStore(storeId);
}

export async function getSubstitutionProposals(formData: FormData) {
    const storeId = parseInt(formData.get('storeId') as string);
    const employeeId = parseInt(formData.get('employeeId') as string);
    const dateStr = formData.get('date') as string;
    const start = formData.get('start') as string;
    const end = formData.get('end') as string;

    try {
        const substitutes = findSubstitutes(storeId, dateStr, start, end);

        const candidates = substitutes.slice(0, 5).map((sub, idx) => {
            const weekCheck = checkWeeklyHours(sub.id, dateStr);
            const reason: string[] = [];
            if (weekCheck) {
                reason.push(`Horas asignadas esta semana: ${weekCheck.assignedHours}h / ${weekCheck.contractHours}h`);
                if (!weekCheck.overLimit) reason.push('Dentro del l\u00edmite de horas');
                else reason.push('AVISO: Supera el l\u00edmite de horas semanales');
            }
            reason.push(`Tienda habitual: ID ${sub.store_id}`);

            return {
                id: sub.id,
                name: sub.name,
                weekly_hours: sub.weekly_hours,
                score: weekCheck && !weekCheck.overLimit ? 90 - idx * 5 : 50 - idx * 5,
                reason,
            };
        });

        return { candidates };
    } catch (error) {
        console.error('Error getting substitution proposals:', error);
        return { candidates: [] };
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

        // Validate weekly hours for substitute
        const weekCheck = checkWeeklyHours(substituteId, dateStr);
        if (weekCheck?.overLimit) {
            return { success: false, error: `${substitute.name} supera el l\u00edmite de horas semanales (${weekCheck.assignedHours}h / ${weekCheck.contractHours}h)` };
        }

        createSchedule({
            employee_id: employee.id,
            store_id: employee.store_id,
            date: dateStr,
            start_time: '00:00',
            end_time: '23:59',
            type: 'absence'
        });

        // Use store hours for realistic shift times
        const store = getStoreById(employee.store_id);
        const startTime = store?.open_time_weekday || '06:30';
        const endTime = store?.close_time_weekday || '14:30';

        createSchedule({
            employee_id: substitute.id,
            store_id: employee.store_id,
            date: dateStr,
            start_time: startTime,
            end_time: endTime,
            type: 'reinforcement'
        });

        revalidatePath(`/store/${employee.store_id}`);
        return { success: true };
    } catch (error) {
        console.error('Error assigning substitute:', error);
        return { success: false, error: 'Failed to assign substitute' };
    }
}

// --- Shift Editing ---

export async function createManualShift(employeeId: number, storeId: number, dateStr: string, startTime: string, endTime: string, type: string) {
    try {
        const conflicts = detectConflicts(dateStr);
        const empConflict = conflicts.find(c => c.employeeId === employeeId);
        if (empConflict) {
            return { success: false, error: `Conflicto: ${empConflict.employeeName} ya tiene turno en ${empConflict.store1} (${empConflict.time1})` };
        }

        const weekCheck = checkWeeklyHours(employeeId, dateStr);
        if (weekCheck?.overLimit) {
            return { success: false, error: `${weekCheck.employeeName} supera el l\u00edmite semanal (${weekCheck.assignedHours}h / ${weekCheck.contractHours}h)` };
        }

        createSchedule({
            employee_id: employeeId,
            store_id: storeId,
            date: dateStr,
            start_time: startTime,
            end_time: endTime,
            type: type as 'work' | 'absence' | 'reinforcement',
        });

        revalidatePath(`/store/${storeId}`);
        return { success: true };
    } catch (error) {
        console.error('Error creating shift:', error);
        return { success: false, error: 'Failed to create shift' };
    }
}

export async function removeShift(scheduleId: number, storeId: number) {
    try {
        deleteSchedule(scheduleId);
        revalidatePath(`/store/${storeId}`);
        return { success: true };
    } catch (error) {
        console.error('Error removing shift:', error);
        return { success: false, error: 'Failed to remove shift' };
    }
}

// --- Conflict Detection ---

export async function getConflicts(dateStr: string) {
    try {
        const conflicts = detectConflicts(dateStr);
        return { success: true, data: conflicts };
    } catch (error) {
        console.error('Error detecting conflicts:', error);
        return { success: false, error: 'Failed to detect conflicts' };
    }
}
