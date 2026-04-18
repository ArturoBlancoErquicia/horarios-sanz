import db from './db';

export * from './types';
import { Store, Employee, Schedule } from './types';

export function getAllStores(): Store[] {
    return db.prepare('SELECT * FROM stores').all() as Store[];
}

export function getEmployeesByStore(storeId: number): Employee[] {
    return db.prepare('SELECT * FROM employees WHERE store_id = ?').all(storeId) as Employee[];
}

export function getAllEmployees(): Employee[] {
    return db.prepare('SELECT * FROM employees').all() as Employee[];
}

export function getStoreById(id: number): Store | undefined {
    return db.prepare('SELECT * FROM stores WHERE id = ?').get(id) as Store | undefined;
}

export function getSchedulesByDate(date: string): Schedule[] {
    return db.prepare('SELECT * FROM schedules WHERE date = ?').all(date) as Schedule[];
}

export function createSchedule(schedule: Omit<Schedule, 'id'>): void {
    const stmt = db.prepare(`
        INSERT INTO schedules (employee_id, store_id, date, start_time, end_time, type)
        VALUES (@employee_id, @store_id, @date, @start_time, @end_time, @type)
    `);
    stmt.run(schedule);
}
