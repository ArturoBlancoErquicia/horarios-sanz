import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before imports
vi.mock('@/lib/logic', () => ({
    findSubstitutes: vi.fn(),
    checkWeeklyHours: vi.fn(),
    detectConflicts: vi.fn(),
}));

vi.mock('@/lib/data', () => ({
    createSchedule: vi.fn(),
    getEmployeesByStore: vi.fn(),
    getAllEmployees: vi.fn(),
    getStoreById: vi.fn(),
    updateSchedule: vi.fn(),
    deleteSchedule: vi.fn(),
}));

vi.mock('next/cache', () => ({
    revalidatePath: vi.fn(),
}));

import { findSubstitutes, checkWeeklyHours, detectConflicts } from '@/lib/logic';
import { createSchedule, getEmployeesByStore, getAllEmployees, getStoreById, deleteSchedule } from '@/lib/data';
import { revalidatePath } from 'next/cache';
import {
    getSubstitutes,
    getStoreEmployees,
    assignSubstitute,
    createManualShift,
    removeShift,
    getConflicts,
} from '@/app/actions';

const mockFindSubstitutes = vi.mocked(findSubstitutes);
const mockCheckWeeklyHours = vi.mocked(checkWeeklyHours);
const mockDetectConflicts = vi.mocked(detectConflicts);
const mockCreateSchedule = vi.mocked(createSchedule);
const mockGetEmployeesByStore = vi.mocked(getEmployeesByStore);
const mockGetAllEmployees = vi.mocked(getAllEmployees);
const mockGetStoreById = vi.mocked(getStoreById);
const mockDeleteSchedule = vi.mocked(deleteSchedule);
const mockRevalidatePath = vi.mocked(revalidatePath);

beforeEach(() => {
    vi.clearAllMocks();
});

// --- Helpers ---

const employee = { id: 1, name: 'Carmen', store_id: 1, weekly_hours: 35, rules: '' };
const substitute = { id: 2, name: 'Natalia', store_id: 1, weekly_hours: 30, rules: '' };
const store = { id: 1, name: 'San Julian', open_time_weekday: '06:30', close_time_weekday: '14:30' };

// --- Tests ---

describe('getSubstitutes', () => {
    it('returns success with data', async () => {
        mockFindSubstitutes.mockReturnValue([substitute]);

        const result = await getSubstitutes('2026-03-15');

        expect(result).toEqual({ success: true, data: [substitute] });
        expect(mockFindSubstitutes).toHaveBeenCalledWith(0, '2026-03-15', '00:00', '23:59');
    });

    it('returns error on failure', async () => {
        mockFindSubstitutes.mockImplementation(() => { throw new Error('DB error'); });

        const result = await getSubstitutes('2026-03-15');

        expect(result).toEqual({ success: false, error: 'Failed to find substitutes' });
    });
});

describe('getStoreEmployees', () => {
    it('delegates to getEmployeesByStore', async () => {
        mockGetEmployeesByStore.mockReturnValue([employee]);

        const result = await getStoreEmployees(1);

        expect(mockGetEmployeesByStore).toHaveBeenCalledWith(1);
        expect(result).toEqual([employee]);
    });
});

describe('assignSubstitute', () => {
    it('creates absence + reinforcement and validates hours', async () => {
        mockGetAllEmployees.mockReturnValue([employee, substitute]);
        mockCheckWeeklyHours.mockReturnValue(null);
        mockGetStoreById.mockReturnValue(store);

        const result = await assignSubstitute(1, 2, '2026-03-15');

        expect(result).toEqual({ success: true });

        // Should create absence for the employee
        expect(mockCreateSchedule).toHaveBeenCalledWith({
            employee_id: 1,
            store_id: 1,
            date: '2026-03-15',
            start_time: '00:00',
            end_time: '23:59',
            type: 'absence',
        });

        // Should create reinforcement for the substitute using store hours
        expect(mockCreateSchedule).toHaveBeenCalledWith({
            employee_id: 2,
            store_id: 1,
            date: '2026-03-15',
            start_time: '06:30',
            end_time: '14:30',
            type: 'reinforcement',
        });

        expect(mockRevalidatePath).toHaveBeenCalledWith('/store/1');
    });

    it('rejects when substitute exceeds weekly hours limit', async () => {
        mockGetAllEmployees.mockReturnValue([employee, substitute]);
        mockCheckWeeklyHours.mockReturnValue({
            employeeId: 2,
            employeeName: 'Natalia',
            contractHours: 30,
            assignedHours: 32,
            difference: 2,
            overLimit: true,
        });

        const result = await assignSubstitute(1, 2, '2026-03-15');

        expect(result.success).toBe(false);
        expect(result.error).toContain('Natalia');
        expect(result.error).toContain('32');
        expect(result.error).toContain('30');
        expect(mockCreateSchedule).not.toHaveBeenCalled();
    });

    it('returns error when employee not found', async () => {
        mockGetAllEmployees.mockReturnValue([substitute]);

        const result = await assignSubstitute(1, 2, '2026-03-15');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Failed to assign substitute');
    });
});

describe('createManualShift', () => {
    it('creates shift when no conflicts', async () => {
        mockDetectConflicts.mockReturnValue([]);
        mockCheckWeeklyHours.mockReturnValue(null);

        const result = await createManualShift(1, 1, '2026-03-15', '06:30', '14:30', 'work');

        expect(result).toEqual({ success: true });
        expect(mockCreateSchedule).toHaveBeenCalledWith({
            employee_id: 1,
            store_id: 1,
            date: '2026-03-15',
            start_time: '06:30',
            end_time: '14:30',
            type: 'work',
        });
        expect(mockRevalidatePath).toHaveBeenCalledWith('/store/1');
    });

    it('rejects on conflict', async () => {
        mockDetectConflicts.mockReturnValue([
            {
                employeeId: 1,
                employeeName: 'Carmen',
                date: '2026-03-15',
                store1: 'San Julian',
                store2: 'Castralvo',
                time1: '06:30-14:30',
                time2: '07:00-15:00',
            },
        ]);

        const result = await createManualShift(1, 2, '2026-03-15', '07:00', '15:00', 'work');

        expect(result.success).toBe(false);
        expect(result.error).toContain('Conflicto');
        expect(result.error).toContain('Carmen');
        expect(mockCreateSchedule).not.toHaveBeenCalled();
    });

    it('rejects when employee exceeds weekly hours', async () => {
        mockDetectConflicts.mockReturnValue([]);
        mockCheckWeeklyHours.mockReturnValue({
            employeeId: 1,
            employeeName: 'Carmen',
            contractHours: 35,
            assignedHours: 38,
            difference: 3,
            overLimit: true,
        });

        const result = await createManualShift(1, 1, '2026-03-15', '06:30', '14:30', 'work');

        expect(result.success).toBe(false);
        expect(result.error).toContain('Carmen');
        expect(result.error).toContain('38');
        expect(mockCreateSchedule).not.toHaveBeenCalled();
    });
});

describe('removeShift', () => {
    it('deletes and revalidates', async () => {
        const result = await removeShift(10, 1);

        expect(result).toEqual({ success: true });
        expect(mockDeleteSchedule).toHaveBeenCalledWith(10);
        expect(mockRevalidatePath).toHaveBeenCalledWith('/store/1');
    });

    it('returns error on failure', async () => {
        mockDeleteSchedule.mockImplementation(() => { throw new Error('DB error'); });

        const result = await removeShift(10, 1);

        expect(result).toEqual({ success: false, error: 'Failed to remove shift' });
    });
});

describe('getConflicts', () => {
    it('returns conflict data', async () => {
        const conflicts = [
            {
                employeeId: 1,
                employeeName: 'Carmen',
                date: '2026-03-15',
                store1: 'San Julian',
                store2: 'Castralvo',
                time1: '06:30-14:30',
                time2: '07:00-15:00',
            },
        ];
        mockDetectConflicts.mockReturnValue(conflicts);

        const result = await getConflicts('2026-03-15');

        expect(result).toEqual({ success: true, data: conflicts });
        expect(mockDetectConflicts).toHaveBeenCalledWith('2026-03-15');
    });

    it('returns error on failure', async () => {
        mockDetectConflicts.mockImplementation(() => { throw new Error('fail'); });

        const result = await getConflicts('2026-03-15');

        expect(result).toEqual({ success: false, error: 'Failed to detect conflicts' });
    });
});
