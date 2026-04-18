import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getISOWeek } from 'date-fns';

// Mock the database layer before importing logic
vi.mock('@/lib/data', () => ({
    getAllStores: vi.fn(),
    getAllEmployees: vi.fn(),
    getSchedulesByDate: vi.fn(),
}));

vi.mock('@/lib/holidays', () => ({
    getAllHolidays: vi.fn(),
}));

import {
    isEvenWeek,
    getStoreShifts,
    parseTimeToHours,
    shiftDurationHours,
    detectConflicts,
    checkWeeklyHours,
    type Shift,
} from '@/lib/logic';
import { getAllStores, getAllEmployees, getSchedulesByDate } from '@/lib/data';
import { getAllHolidays } from '@/lib/holidays';
import type { Store, Employee, Schedule } from '@/lib/types';
import type { Holiday } from '@/lib/holidays';

// --- Mock Data ---

const stores: Store[] = [
    { id: 52, name: 'SAN JULIAN', open_time_weekday: '08:00', close_time_weekday: '14:30', open_time_saturday: '08:00', close_time_saturday: '14:30', open_time_sunday: '08:00', close_time_sunday: '14:30' },
    { id: 53, name: 'CASTRALVO', open_time_weekday: '06:30', close_time_weekday: '15:00', open_time_saturday: '06:30', close_time_saturday: '15:00', open_time_sunday: '06:30', close_time_sunday: '15:00' },
    { id: 57, name: 'SAN JUAN', open_time_weekday: '09:00', close_time_weekday: '15:15', open_time_saturday: '09:00', close_time_saturday: '14:45', open_time_sunday: '09:30', close_time_sunday: '14:45' },
];

const employees: Employee[] = [
    // San Julian
    { id: 1, name: 'CARMEN', store_id: 52, weekly_hours: 35, rules: '' },
    { id: 2, name: 'NATALIA', store_id: 52, weekly_hours: 30, rules: '' },
    { id: 3, name: 'MARIANIS', store_id: 52, weekly_hours: 5, rules: '' },
    // Castralvo
    { id: 4, name: 'MAR', store_id: 53, weekly_hours: 40, rules: '' },
    { id: 5, name: 'ESTHER M', store_id: 53, weekly_hours: 40, rules: '' },
    { id: 6, name: 'VICKY', store_id: 53, weekly_hours: 30, rules: '' },
    { id: 7, name: 'JORGE', store_id: 53, weekly_hours: 7.5, rules: '' },
    // San Juan
    { id: 15, name: 'ANGELA', store_id: 57, weekly_hours: 30, rules: '' },
    { id: 16, name: 'ISABEL', store_id: 57, weekly_hours: 20, rules: '' },
];

const noHolidays: Holiday[] = [];

// Helper to get employees for a specific store
function storeEmployees(storeId: number): Employee[] {
    return employees.filter(e => e.store_id === storeId);
}

function findStore(id: number): Store {
    return stores.find(s => s.id === id)!;
}

function shiftNames(shifts: Shift[]): string[] {
    return shifts.map(s => s.emp);
}

// --- Setup mocks for each test ---

beforeEach(() => {
    vi.mocked(getSchedulesByDate).mockReturnValue([]);
    vi.mocked(getAllStores).mockReturnValue(stores);
    vi.mocked(getAllEmployees).mockReturnValue(employees);
    vi.mocked(getAllHolidays).mockReturnValue(noHolidays);
});

// =============================================================================
// 1. isEvenWeek
// =============================================================================

describe('isEvenWeek', () => {
    it('returns true for March 2, 2026 (ISO week 10, even)', () => {
        const date = new Date(2026, 2, 2); // Monday
        expect(getISOWeek(date)).toBe(10); // sanity check
        expect(isEvenWeek(date)).toBe(true);
    });

    it('returns true for March 7, 2026 (Saturday, still ISO week 10)', () => {
        const date = new Date(2026, 2, 7);
        expect(getISOWeek(date)).toBe(10);
        expect(isEvenWeek(date)).toBe(true);
    });

    it('returns false for March 9, 2026 (ISO week 11, odd)', () => {
        const date = new Date(2026, 2, 9); // Monday
        expect(getISOWeek(date)).toBe(11);
        expect(isEvenWeek(date)).toBe(false);
    });

    it('returns false for March 14, 2026 (Saturday, ISO week 11, odd)', () => {
        const date = new Date(2026, 2, 14);
        expect(getISOWeek(date)).toBe(11);
        expect(isEvenWeek(date)).toBe(false);
    });

    it('returns true for January 5, 2026 (ISO week 2, even)', () => {
        const date = new Date(2026, 0, 5); // Monday
        expect(getISOWeek(date)).toBe(2);
        expect(isEvenWeek(date)).toBe(true);
    });
});

// =============================================================================
// 2. San Julian shifts
// =============================================================================

describe('getStoreShifts - San Julian', () => {
    const sanJulian = stores[0]; // id: 52
    const sjEmployees = () => storeEmployees(52);

    describe('Weekday (Mon-Fri, non-Wednesday)', () => {
        it('schedules Carmen and Natalia on Monday', () => {
            const monday = new Date(2026, 2, 2); // Mon March 2
            const shifts = getStoreShifts(sanJulian, monday, sjEmployees(), noHolidays);

            const names = shiftNames(shifts);
            expect(names).toContain('CARMEN');
            expect(names).toContain('NATALIA');
            expect(names).not.toContain('MARIANIS');
            expect(shifts.length).toBe(2);
        });

        it('applies 15m buffer to standard weekday shifts', () => {
            const monday = new Date(2026, 2, 2);
            const shifts = getStoreShifts(sanJulian, monday, sjEmployees(), noHolidays);

            // Original open/close is 08:00 - 14:30
            // With 15m buffer: 07:45 - 14:45
            for (const shift of shifts) {
                expect(shift.time).toBe('07:45 - 14:45');
                expect(shift.type).toBe('standard');
            }
        });

        it('schedules Carmen and Natalia on Thursday', () => {
            const thursday = new Date(2026, 2, 5); // Thu March 5
            const shifts = getStoreShifts(sanJulian, thursday, sjEmployees(), noHolidays);
            expect(shiftNames(shifts)).toContain('CARMEN');
            expect(shiftNames(shifts)).toContain('NATALIA');
        });
    });

    describe('Wednesday', () => {
        it('schedules Carmen (standard) + Marianis (reinforcement) on Wednesday', () => {
            const wednesday = new Date(2026, 2, 4); // Wed March 4
            const shifts = getStoreShifts(sanJulian, wednesday, sjEmployees(), noHolidays);

            const names = shiftNames(shifts);
            expect(names).toContain('CARMEN');
            expect(names).toContain('MARIANIS');
            expect(names).not.toContain('NATALIA');
        });

        it('Carmen has standard type, Marianis has reinforcement type on Wednesday', () => {
            const wednesday = new Date(2026, 2, 4);
            const shifts = getStoreShifts(sanJulian, wednesday, sjEmployees(), noHolidays);

            const carmen = shifts.find(s => s.emp === 'CARMEN')!;
            const marianis = shifts.find(s => s.emp === 'MARIANIS')!;
            expect(carmen.type).toBe('standard');
            expect(marianis.type).toBe('reinforcement');
            // Marianis hace las 5h de contrato el miércoles: 09:30-14:30
            expect(marianis.time).toBe('09:30 - 14:30');
        });
    });

    describe('Weekend alternation', () => {
        it('even week Saturday: Natalia works', () => {
            // March 7, 2026 = Saturday, week 10 (even)
            const saturday = new Date(2026, 2, 7);
            expect(isEvenWeek(saturday)).toBe(true);

            const shifts = getStoreShifts(sanJulian, saturday, sjEmployees(), noHolidays);
            expect(shiftNames(shifts)).toContain('NATALIA');
            expect(shiftNames(shifts)).not.toContain('CARMEN');
        });

        it('odd week Saturday: Carmen works', () => {
            // March 14, 2026 = Saturday, week 11 (odd)
            const saturday = new Date(2026, 2, 14);
            expect(isEvenWeek(saturday)).toBe(false);

            const shifts = getStoreShifts(sanJulian, saturday, sjEmployees(), noHolidays);
            expect(shiftNames(shifts)).toContain('CARMEN');
            expect(shiftNames(shifts)).not.toContain('NATALIA');
        });

        it('even week Sunday: Natalia works alone (Marianis solo miércoles)', () => {
            // March 8, 2026 = Sunday, week 10 (even)
            const sunday = new Date(2026, 2, 8);
            expect(isEvenWeek(sunday)).toBe(true);

            const shifts = getStoreShifts(sanJulian, sunday, sjEmployees(), noHolidays);
            const names = shiftNames(shifts);
            expect(names).toContain('NATALIA');
            expect(names).not.toContain('MARIANIS');
            expect(names).not.toContain('CARMEN');
        });

        it('Marianis only works Wednesday, not Sunday', () => {
            const sunday = new Date(2026, 2, 8);
            const shifts = getStoreShifts(sanJulian, sunday, sjEmployees(), noHolidays);
            const marianis = shifts.find(s => s.emp === 'MARIANIS');
            expect(marianis).toBeUndefined();
        });
    });

    describe('Holiday behavior', () => {
        it('holiday on weekday triggers weekend-like alternating logic', () => {
            const holidays: Holiday[] = [{ id: 1, date: '2026-03-02', name: 'Test Holiday' }];
            const monday = new Date(2026, 2, 2); // Even week

            const shifts = getStoreShifts(sanJulian, monday, sjEmployees(), holidays);

            // Semana par con festivo -> Natalia titular (sola; Marianis solo miércoles)
            const names = shiftNames(shifts);
            expect(names).toContain('NATALIA');
            expect(names).not.toContain('CARMEN');
        });

        it('holiday shifts have holiday_shift type for main employee', () => {
            const holidays: Holiday[] = [{ id: 1, date: '2026-03-02', name: 'Test Holiday' }];
            const monday = new Date(2026, 2, 2);

            const shifts = getStoreShifts(sanJulian, monday, sjEmployees(), holidays);
            const mainShift = shifts.find(s => s.emp === 'NATALIA')!;
            expect(mainShift.type).toBe('holiday_shift');
        });
    });

    describe('Absence handling', () => {
        it('filters out absent employees from shift generation', () => {
            // Carmen has an absence
            vi.mocked(getSchedulesByDate).mockReturnValue([
                { id: 100, employee_id: 1, store_id: 52, date: '2026-03-02', start_time: '', end_time: '', type: 'absence' },
            ]);

            const monday = new Date(2026, 2, 2);
            const shifts = getStoreShifts(sanJulian, monday, sjEmployees(), noHolidays);

            const names = shiftNames(shifts);
            expect(names).not.toContain('CARMEN');
            // Natalia should still be there
            expect(names).toContain('NATALIA');
        });
    });
});

// =============================================================================
// 3. Castralvo shifts
// =============================================================================

describe('getStoreShifts - Castralvo', () => {
    const castralvo = stores[1]; // id: 53
    const cvEmployees = () => storeEmployees(53);

    describe('Weekday rotation', () => {
        it('Monday: Mar (A 06:30-14:30, 8h) + Esther M (B 07:00-15:00, 8h) + Vicky refuerzo', () => {
            const monday = new Date(2026, 2, 2);
            const shifts = getStoreShifts(castralvo, monday, cvEmployees(), noHolidays);

            const mar = shifts.find(s => s.emp === 'MAR')!;
            const esther = shifts.find(s => s.emp === 'ESTHER M')!;
            const vicky = shifts.find(s => s.emp === 'VICKY')!;

            expect(mar).toBeDefined();
            expect(esther).toBeDefined();
            expect(vicky).toBeDefined();
            // Castralvo ya no aplica buffer: los 8h del titular son jornada completa exacta
            expect(mar.time).toBe('06:30 - 14:30');
            expect(mar.type).toBe('standard');
            expect(esther.time).toBe('07:00 - 15:00');
            expect(vicky.time).toBe('09:00 - 12:00');
            expect(vicky.type).toBe('reinforcement');
        });

        it('Tuesday: Mar + Esther M + Vicky (refuerzo)', () => {
            const tuesday = new Date(2026, 2, 3);
            const shifts = getStoreShifts(castralvo, tuesday, cvEmployees(), noHolidays);

            const names = shiftNames(shifts);
            expect(names).toContain('MAR');
            expect(names).toContain('ESTHER M');
            expect(names).toContain('VICKY');
        });

        it('Wednesday (even week): Mar + Vicky (Esther M libra)', () => {
            const wednesday = new Date(2026, 2, 4);
            expect(isEvenWeek(wednesday)).toBe(true);

            const shifts = getStoreShifts(castralvo, wednesday, cvEmployees(), noHolidays);
            const names = shiftNames(shifts);
            expect(names).toContain('MAR');
            expect(names).toContain('VICKY');
            expect(names).not.toContain('ESTHER M');
        });

        it('Wednesday (odd week): Esther M + Vicky (Mar libra)', () => {
            const wednesday = new Date(2026, 2, 11);
            expect(isEvenWeek(wednesday)).toBe(false);

            const shifts = getStoreShifts(castralvo, wednesday, cvEmployees(), noHolidays);
            const names = shiftNames(shifts);
            expect(names).toContain('ESTHER M');
            expect(names).toContain('VICKY');
            expect(names).not.toContain('MAR');
        });

        it('Friday (even week): Mar + Vicky (Esther M libra)', () => {
            const friday = new Date(2026, 2, 6);
            const shifts = getStoreShifts(castralvo, friday, cvEmployees(), noHolidays);

            const names = shiftNames(shifts);
            expect(names).toContain('MAR');
            expect(names).toContain('VICKY');
            expect(names).not.toContain('ESTHER M');
        });

        it('Friday (odd week): Esther M + Vicky (Mar libra)', () => {
            const friday = new Date(2026, 2, 13);
            const shifts = getStoreShifts(castralvo, friday, cvEmployees(), noHolidays);

            const names = shiftNames(shifts);
            expect(names).toContain('ESTHER M');
            expect(names).toContain('VICKY');
            expect(names).not.toContain('MAR');
        });
    });

    describe('Weekend alternation', () => {
        it('even week Saturday: Esther M + Jorge + Vicky refuerzo', () => {
            // March 7, 2026 = Saturday, week 10 (even)
            const saturday = new Date(2026, 2, 7);
            expect(isEvenWeek(saturday)).toBe(true);

            const shifts = getStoreShifts(castralvo, saturday, cvEmployees(), noHolidays);
            const names = shiftNames(shifts);
            expect(names).toContain('ESTHER M');
            expect(names).toContain('JORGE'); // Jorge cubre el sábado siempre (7.5h)
            expect(names).toContain('VICKY'); // Vicky refuerzo 4h sábado par
            expect(names).not.toContain('MAR');

            const jorge = shifts.find(s => s.emp === 'JORGE')!;
            expect(jorge.time).toBe('07:00 - 14:30'); // 7.5h exactos = contrato
        });

        it('odd week Saturday: Mar + Jorge', () => {
            const saturday = new Date(2026, 2, 14);
            expect(isEvenWeek(saturday)).toBe(false);

            const shifts = getStoreShifts(castralvo, saturday, cvEmployees(), noHolidays);
            const names = shiftNames(shifts);
            expect(names).toContain('MAR');
            expect(names).toContain('JORGE');
            expect(names).not.toContain('ESTHER M');
        });

        it('even week Sunday: Esther M sola (jornada 8h exactos)', () => {
            const sunday = new Date(2026, 2, 8); // week 10, even
            const shifts = getStoreShifts(castralvo, sunday, cvEmployees(), noHolidays);

            const esther = shifts.find(s => s.emp === 'ESTHER M')!;
            expect(esther).toBeDefined();
            expect(esther.time).toBe('06:30 - 14:30');
            // Domingo par: solo Esther (Vicky descansa, Jorge trabaja solo los sábados)
            expect(shiftNames(shifts)).not.toContain('VICKY');
            expect(shiftNames(shifts)).not.toContain('JORGE');
        });

        it('odd week Sunday: Mar + Vicky refuerzo (5h)', () => {
            const sunday = new Date(2026, 2, 15); // week 11, odd
            const shifts = getStoreShifts(castralvo, sunday, cvEmployees(), noHolidays);

            const mar = shifts.find(s => s.emp === 'MAR')!;
            const vicky = shifts.find(s => s.emp === 'VICKY')!;
            expect(mar).toBeDefined();
            expect(mar.time).toBe('06:30 - 14:30');
            expect(vicky).toBeDefined();
            expect(vicky.type).toBe('reinforcement');
            expect(vicky.time).toBe('09:30 - 14:30');
        });
    });

    describe('Holiday on weekday', () => {
        it('even week (MAR focus) holiday: Mar with holiday_shift', () => {
            const holidays: Holiday[] = [{ id: 1, date: '2026-03-02', name: 'Fiesta' }];
            const monday = new Date(2026, 2, 2); // even week

            const shifts = getStoreShifts(castralvo, monday, cvEmployees(), holidays);
            const mar = shifts.find(s => s.emp === 'MAR')!;
            expect(mar).toBeDefined();
            expect(mar.type).toBe('holiday_shift');
        });

        it('odd week holiday: Esther M holiday_shift + Vicky reinforcement', () => {
            const holidays: Holiday[] = [{ id: 2, date: '2026-03-09', name: 'Fiesta' }];
            const monday = new Date(2026, 2, 9); // odd week

            const shifts = getStoreShifts(castralvo, monday, cvEmployees(), holidays);
            const esther = shifts.find(s => s.emp === 'ESTHER M')!;
            const vicky = shifts.find(s => s.emp === 'VICKY')!;
            expect(esther).toBeDefined();
            expect(esther.type).toBe('holiday_shift');
            expect(vicky).toBeDefined();
            expect(vicky.type).toBe('reinforcement');
        });
    });
});

// =============================================================================
// 4. San Juan shifts
// =============================================================================

describe('getStoreShifts - San Juan', () => {
    const sanJuan = stores[2]; // id: 57
    const sjEmployees = () => storeEmployees(57);

    describe('Weekend alternation', () => {
        it('even week Saturday: Isabel works', () => {
            const saturday = new Date(2026, 2, 7); // week 10, even
            const shifts = getStoreShifts(sanJuan, saturday, sjEmployees(), noHolidays);

            expect(shiftNames(shifts)).toContain('ISABEL');
            expect(shiftNames(shifts)).not.toContain('ANGELA');
            expect(shifts.length).toBe(1);
        });

        it('odd week Saturday: Angela works', () => {
            const saturday = new Date(2026, 2, 14); // week 11, odd
            const shifts = getStoreShifts(sanJuan, saturday, sjEmployees(), noHolidays);

            expect(shiftNames(shifts)).toContain('ANGELA');
            expect(shiftNames(shifts)).not.toContain('ISABEL');
        });

        it('even week Sunday: Isabel works with sunday time', () => {
            const sunday = new Date(2026, 2, 8);
            const shifts = getStoreShifts(sanJuan, sunday, sjEmployees(), noHolidays);

            const isabel = shifts.find(s => s.emp === 'ISABEL')!;
            expect(isabel).toBeDefined();
            // Sunday openClose: 09:30-14:45, no buffer applied on weekend return path
            // Actually the weekend path returns without buffer map since it returns early
            // Checking the code: weekend returns immediately without buffer
            expect(isabel.time).toBe('09:30 - 14:45');
        });

        it('Saturday uses saturday open/close times', () => {
            const saturday = new Date(2026, 2, 7);
            const shifts = getStoreShifts(sanJuan, saturday, sjEmployees(), noHolidays);

            const shift = shifts[0];
            // Saturday: 09:00 - 14:45 (no buffer, early return)
            expect(shift.time).toBe('09:00 - 14:45');
        });
    });

    describe('Weekday pattern (even/odd weeks)', () => {
        it('even week Monday: Angela sola (Isabel refuerza martes)', () => {
            const monday = new Date(2026, 2, 2); // Mon, week 10 even
            const shifts = getStoreShifts(sanJuan, monday, sjEmployees(), noHolidays);

            expect(shiftNames(shifts)).toContain('ANGELA');
            expect(shiftNames(shifts)).not.toContain('ISABEL');
        });

        it('even week Tuesday: Angela + Isabel (refuerzo 4.5h)', () => {
            const tuesday = new Date(2026, 2, 3);
            const shifts = getStoreShifts(sanJuan, tuesday, sjEmployees(), noHolidays);

            expect(shiftNames(shifts)).toContain('ANGELA');
            expect(shiftNames(shifts)).toContain('ISABEL');
            const isabel = shifts.find(s => s.emp === 'ISABEL')!;
            expect(isabel.type).toBe('reinforcement');
        });

        it('even week Wednesday: solo Angela', () => {
            const wednesday = new Date(2026, 2, 4); // Wed, week 10 even
            const shifts = getStoreShifts(sanJuan, wednesday, sjEmployees(), noHolidays);

            expect(shiftNames(shifts)).toContain('ANGELA');
            expect(shiftNames(shifts)).not.toContain('ISABEL');
        });

        it('even week Friday: Isabel titular + Angela refuerzo', () => {
            const friday = new Date(2026, 2, 6);
            const shifts = getStoreShifts(sanJuan, friday, sjEmployees(), noHolidays);

            expect(shiftNames(shifts)).toContain('ISABEL');
            const isabel = shifts.find(s => s.emp === 'ISABEL')!;
            expect(isabel.type).toBe('standard');
            const angela = shifts.find(s => s.emp === 'ANGELA')!;
            expect(angela).toBeDefined();
            expect(angela.type).toBe('reinforcement');
        });

        it('odd week Monday: Isabel titular + Angela refuerzo (5.5h)', () => {
            const monday = new Date(2026, 2, 9); // Mon, week 11 odd
            const shifts = getStoreShifts(sanJuan, monday, sjEmployees(), noHolidays);
            expect(shiftNames(shifts)).toContain('ISABEL');
            expect(shiftNames(shifts)).toContain('ANGELA');
            const angela = shifts.find(s => s.emp === 'ANGELA')!;
            expect(angela.type).toBe('reinforcement');

            const tuesday = new Date(2026, 2, 10); // Tue, week 11 odd
            const shiftsT = getStoreShifts(sanJuan, tuesday, sjEmployees(), noHolidays);
            expect(shiftNames(shiftsT)).toContain('ISABEL');
            expect(shiftNames(shiftsT)).not.toContain('ANGELA');
        });

        it('odd week Friday: Angela sola (Isabel libra viernes ODD)', () => {
            const friday = new Date(2026, 2, 13); // Fri, week 11 odd
            const shifts = getStoreShifts(sanJuan, friday, sjEmployees(), noHolidays);

            expect(shiftNames(shifts)).toContain('ANGELA');
            expect(shiftNames(shifts)).not.toContain('ISABEL');
        });

        it('weekday standard shifts sin buffer (horario exacto de apertura)', () => {
            const monday = new Date(2026, 2, 2); // even week
            const shifts = getStoreShifts(sanJuan, monday, sjEmployees(), noHolidays);

            const angela = shifts.find(s => s.emp === 'ANGELA')!;
            // Sin buffer para cuadrar horas de contrato exactas
            expect(angela.time).toBe('09:00 - 15:15');
            expect(angela.type).toBe('standard');
        });
    });

    describe('Holiday', () => {
        it('holiday uses sunday open/close and alternating assignment', () => {
            const holidays: Holiday[] = [{ id: 1, date: '2026-03-02', name: 'Fiesta' }];
            const monday = new Date(2026, 2, 2); // even week

            const shifts = getStoreShifts(sanJuan, monday, sjEmployees(), holidays);
            // Even week holiday -> Isabel
            expect(shiftNames(shifts)).toContain('ISABEL');
            const isabel = shifts.find(s => s.emp === 'ISABEL')!;
            expect(isabel.type).toBe('holiday_shift');
        });
    });
});

// =============================================================================
// 5. parseTimeToHours and shiftDurationHours
// =============================================================================

describe('parseTimeToHours', () => {
    it('parses 08:00 as 8.0', () => {
        expect(parseTimeToHours('08:00')).toBe(8);
    });

    it('parses 14:30 as 14.5', () => {
        expect(parseTimeToHours('14:30')).toBe(14.5);
    });

    it('parses 06:15 as 6.25', () => {
        expect(parseTimeToHours('06:15')).toBe(6.25);
    });

    it('parses 09:45 as 9.75', () => {
        expect(parseTimeToHours('09:45')).toBe(9.75);
    });

    it('parses 00:00 as 0', () => {
        expect(parseTimeToHours('00:00')).toBe(0);
    });

    it('parses 15:15 as 15.25', () => {
        expect(parseTimeToHours('15:15')).toBe(15.25);
    });
});

describe('shiftDurationHours', () => {
    it('calculates 08:00 - 14:30 as 6.5 hours', () => {
        expect(shiftDurationHours('08:00', '14:30')).toBe(6.5);
    });

    it('calculates 06:30 - 15:00 as 8.5 hours', () => {
        expect(shiftDurationHours('06:30', '15:00')).toBe(8.5);
    });

    it('calculates 09:30 - 14:30 as 5 hours', () => {
        expect(shiftDurationHours('09:30', '14:30')).toBe(5);
    });

    it('calculates 07:45 - 14:45 as 7 hours', () => {
        expect(shiftDurationHours('07:45', '14:45')).toBe(7);
    });

    it('calculates 09:00 - 15:15 as 6.25 hours', () => {
        expect(shiftDurationHours('09:00', '15:15')).toBe(6.25);
    });
});

// =============================================================================
// 6. detectConflicts
// =============================================================================

describe('detectConflicts', () => {
    it('returns empty array when no conflicts exist', () => {
        // Default mocks: getSchedulesByDate returns [], no overlapping shifts
        const conflicts = detectConflicts('2026-03-02');
        expect(conflicts).toEqual([]);
    });

    it('detects a conflict when an employee has overlapping shifts in different stores', () => {
        // Override getAllStores to include two stores that would both schedule the same employee
        // Create a scenario: NATALIA appears in both San Julian and a fake Aragon store
        const storesWithAragon: Store[] = [
            ...stores,
            { id: 54, name: 'AV ARAGON', open_time_weekday: '08:00', close_time_weekday: '14:15', open_time_saturday: '07:30', close_time_saturday: '14:15', open_time_sunday: '08:30', close_time_sunday: '14:15' },
        ];

        // Add Natalia also as an Aragon employee (cross-store)
        const employeesWithCross: Employee[] = [
            ...employees,
            { id: 20, name: 'ESTHER P', store_id: 54, weekly_hours: 25, rules: '' },
            { id: 21, name: 'KARLA', store_id: 54, weekly_hours: 20, rules: '' },
        ];

        vi.mocked(getAllStores).mockReturnValue(storesWithAragon);
        vi.mocked(getAllEmployees).mockReturnValue(employeesWithCross);

        // On a non-Wednesday weekday, Natalia works at San Julian.
        // On a Wednesday, she appears as "NATALIA (San Julian)" mock at Aragon.
        // The mock name is different so no actual conflict for the simple case.

        // Let's test with a manual schedule that creates a real overlap.
        // Add a reinforcement schedule that puts CARMEN in both stores
        vi.mocked(getSchedulesByDate).mockReturnValue([
            { id: 200, employee_id: 1, store_id: 54, date: '2026-03-02', start_time: '08:00', end_time: '12:00', type: 'reinforcement' },
        ]);

        const conflicts = detectConflicts('2026-03-02');
        // CARMEN would be in San Julian (via logic) and Aragon (via DB reinforcement)
        const carmenConflict = conflicts.find(c => c.employeeName === 'CARMEN');
        expect(carmenConflict).toBeDefined();
        expect(carmenConflict!.store1).not.toBe(carmenConflict!.store2);
    });
});

// =============================================================================
// 7. checkWeeklyHours
// =============================================================================

describe('checkWeeklyHours', () => {
    it('returns null for non-existent employee', () => {
        const result = checkWeeklyHours(999, '2026-03-02');
        expect(result).toBeNull();
    });

    it('returns a WeeklyHoursCheck object for a valid employee', () => {
        const result = checkWeeklyHours(15, '2026-03-02'); // ANGELA, 30h contract
        expect(result).not.toBeNull();
        expect(result!.employeeId).toBe(15);
        expect(result!.employeeName).toBe('ANGELA');
        expect(result!.contractHours).toBe(30);
    });

    it('sums hours across all days of the week for the employee', () => {
        const result = checkWeeklyHours(15, '2026-03-02'); // ANGELA
        // Angela works at San Juan. In even week (10):
        // Mon-Fri: Angela works M-F (with buffer 08:45-15:30 = 6.75h)
        // Plus Wed she also works (Angela standard + Isabel reinforcement)
        // Sat: no (Isabel weekend)
        // Sun: no (Isabel weekend)
        // assignedHours should be > 0
        expect(result!.assignedHours).toBeGreaterThan(0);
    });

    it('calculates difference from contract hours', () => {
        const result = checkWeeklyHours(15, '2026-03-02');
        expect(result!.difference).toBe(
            Math.round((result!.assignedHours - result!.contractHours) * 10) / 10
        );
    });

    it('flags overLimit when assigned hours exceed contract by more than 10%', () => {
        const result = checkWeeklyHours(15, '2026-03-02'); // ANGELA, 30h
        // overLimit = assignedHours > 30 * 1.1 = 33h
        expect(result!.overLimit).toBe(result!.assignedHours > 33);
    });

    it('computes hours for Carmen across a full week', () => {
        const result = checkWeeklyHours(1, '2026-03-02'); // CARMEN, 35h contract
        expect(result).not.toBeNull();
        expect(result!.employeeName).toBe('CARMEN');
        expect(result!.contractHours).toBe(35);
        // Carmen should have assigned hours from San Julian
        expect(result!.assignedHours).toBeGreaterThan(0);
    });
});
