import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockAll, mockGet, mockRun, mockPrepare } = vi.hoisted(() => {
    const mockAll = vi.fn();
    const mockGet = vi.fn();
    const mockRun = vi.fn();
    const mockPrepare = vi.fn(() => ({
        all: mockAll,
        get: mockGet,
        run: mockRun,
    }));
    return { mockAll, mockGet, mockRun, mockPrepare };
});

vi.mock('@/lib/db', () => ({
    default: { prepare: mockPrepare, pragma: vi.fn() },
}));

import {
    getAllStores,
    getEmployeesByStore,
    getAllEmployees,
    getEmployeeById,
    getStoreById,
    getSchedulesByDate,
    getSchedulesByDateRange,
    getSchedulesByEmployee,
    createSchedule,
    updateSchedule,
    deleteSchedule,
} from '@/lib/data';

beforeEach(() => {
    vi.clearAllMocks();
    mockPrepare.mockReturnValue({ all: mockAll, get: mockGet, run: mockRun });
});

describe('getAllStores', () => {
    it('returns array of stores from DB', () => {
        const stores = [
            { id: 1, name: 'San Julian', open_time_weekday: '06:30', close_time_weekday: '14:30' },
            { id: 2, name: 'Castralvo', open_time_weekday: '06:00', close_time_weekday: '14:00' },
        ];
        mockAll.mockReturnValue(stores);

        const result = getAllStores();

        expect(mockPrepare).toHaveBeenCalledWith('SELECT * FROM stores');
        expect(mockAll).toHaveBeenCalled();
        expect(result).toEqual(stores);
    });
});

describe('getEmployeesByStore', () => {
    it('passes storeId parameter correctly', () => {
        const employees = [{ id: 1, name: 'Carmen', store_id: 1, weekly_hours: 35, rules: '' }];
        mockAll.mockReturnValue(employees);

        const result = getEmployeesByStore(1);

        expect(mockPrepare).toHaveBeenCalledWith('SELECT * FROM employees WHERE store_id = ?');
        expect(mockAll).toHaveBeenCalledWith(1);
        expect(result).toEqual(employees);
    });
});

describe('getAllEmployees', () => {
    it('returns all employees', () => {
        const employees = [
            { id: 1, name: 'Carmen', store_id: 1, weekly_hours: 35, rules: '' },
            { id: 2, name: 'Mar', store_id: 2, weekly_hours: 40, rules: '' },
        ];
        mockAll.mockReturnValue(employees);

        const result = getAllEmployees();

        expect(mockPrepare).toHaveBeenCalledWith('SELECT * FROM employees');
        expect(result).toEqual(employees);
    });
});

describe('getEmployeeById', () => {
    it('returns single employee when found', () => {
        const employee = { id: 1, name: 'Carmen', store_id: 1, weekly_hours: 35, rules: '' };
        mockGet.mockReturnValue(employee);

        const result = getEmployeeById(1);

        expect(mockPrepare).toHaveBeenCalledWith('SELECT * FROM employees WHERE id = ?');
        expect(mockGet).toHaveBeenCalledWith(1);
        expect(result).toEqual(employee);
    });

    it('returns undefined when not found', () => {
        mockGet.mockReturnValue(undefined);

        const result = getEmployeeById(999);

        expect(result).toBeUndefined();
    });
});

describe('getStoreById', () => {
    it('returns store when found', () => {
        const store = { id: 1, name: 'San Julian', open_time_weekday: '06:30', close_time_weekday: '14:30' };
        mockGet.mockReturnValue(store);

        const result = getStoreById(1);

        expect(mockPrepare).toHaveBeenCalledWith('SELECT * FROM stores WHERE id = ?');
        expect(mockGet).toHaveBeenCalledWith(1);
        expect(result).toEqual(store);
    });

    it('returns undefined when not found', () => {
        mockGet.mockReturnValue(undefined);

        const result = getStoreById(999);

        expect(result).toBeUndefined();
    });
});

describe('getSchedulesByDate', () => {
    it('passes date correctly', () => {
        const schedules = [
            { id: 1, employee_id: 1, store_id: 1, date: '2026-03-15', start_time: '06:30', end_time: '14:30', type: 'work' },
        ];
        mockAll.mockReturnValue(schedules);

        const result = getSchedulesByDate('2026-03-15');

        expect(mockPrepare).toHaveBeenCalledWith('SELECT * FROM schedules WHERE date = ?');
        expect(mockAll).toHaveBeenCalledWith('2026-03-15');
        expect(result).toEqual(schedules);
    });
});

describe('getSchedulesByDateRange', () => {
    it('passes start and end dates', () => {
        const schedules = [
            { id: 1, employee_id: 1, store_id: 1, date: '2026-03-15', start_time: '06:30', end_time: '14:30', type: 'work' },
        ];
        mockAll.mockReturnValue(schedules);

        const result = getSchedulesByDateRange('2026-03-01', '2026-03-31');

        expect(mockPrepare).toHaveBeenCalledWith('SELECT * FROM schedules WHERE date >= ? AND date <= ?');
        expect(mockAll).toHaveBeenCalledWith('2026-03-01', '2026-03-31');
        expect(result).toEqual(schedules);
    });
});

describe('getSchedulesByEmployee', () => {
    it('passes employeeId and date range', () => {
        const schedules = [
            { id: 1, employee_id: 5, store_id: 2, date: '2026-03-10', start_time: '07:00', end_time: '15:00', type: 'work' },
        ];
        mockAll.mockReturnValue(schedules);

        const result = getSchedulesByEmployee(5, '2026-03-01', '2026-03-31');

        expect(mockPrepare).toHaveBeenCalledWith('SELECT * FROM schedules WHERE employee_id = ? AND date >= ? AND date <= ?');
        expect(mockAll).toHaveBeenCalledWith(5, '2026-03-01', '2026-03-31');
        expect(result).toEqual(schedules);
    });
});

describe('createSchedule', () => {
    it('runs insert with correct params', () => {
        const schedule = {
            employee_id: 1,
            store_id: 1,
            date: '2026-03-15',
            start_time: '06:30',
            end_time: '14:30',
            type: 'work' as const,
        };

        createSchedule(schedule);

        expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO schedules'));
        expect(mockRun).toHaveBeenCalledWith(schedule);
    });
});

describe('updateSchedule', () => {
    it('builds UPDATE SQL dynamically from provided fields', () => {
        const updates = { start_time: '07:00', end_time: '15:00' };

        updateSchedule(3, updates);

        expect(mockPrepare).toHaveBeenCalledWith(
            expect.stringContaining('UPDATE schedules SET')
        );
        // Verify it includes both field assignments
        const sql = mockPrepare.mock.calls[0][0] as string;
        expect(sql).toContain('start_time = @start_time');
        expect(sql).toContain('end_time = @end_time');
        expect(sql).toContain('WHERE id = @id');

        expect(mockRun).toHaveBeenCalledWith({ start_time: '07:00', end_time: '15:00', id: 3 });
    });

    it('handles single field update', () => {
        updateSchedule(5, { type: 'absence' });

        const sql = mockPrepare.mock.calls[0][0] as string;
        expect(sql).toContain('type = @type');
        expect(mockRun).toHaveBeenCalledWith({ type: 'absence', id: 5 });
    });
});

describe('deleteSchedule', () => {
    it('runs delete with id', () => {
        deleteSchedule(7);

        expect(mockPrepare).toHaveBeenCalledWith('DELETE FROM schedules WHERE id = ?');
        expect(mockRun).toHaveBeenCalledWith(7);
    });
});
