import db from './db';


export * from './types';
import { Store, Employee, Schedule } from './types';

export function getAllStores(): Store[] {
    // @ts-ignore
    return db.prepare('SELECT * FROM stores').all();
}

export function getEmployeesByStore(storeId: number): Employee[] {
    // @ts-ignore
    return db.prepare('SELECT * FROM employees WHERE store_id = ?').all(storeId);
}

export function getAllEmployees(): Employee[] {
    // @ts-ignore
    return db.prepare('SELECT * FROM employees').all();
}

export function getStoreById(id: number): Store | undefined {
    // @ts-ignore
    return db.prepare('SELECT * FROM stores WHERE id = ?').get(id);
}

export function getSchedulesByDate(date: string): Schedule[] {
    // @ts-ignore
    return db.prepare('SELECT * FROM schedules WHERE date = ?').all(date);
}

export function createSchedule(schedule: Omit<Schedule, 'id'>): void {
    // @ts-ignore
    const stmt = db.prepare(`
        INSERT INTO schedules (employee_id, store_id, date, start_time, end_time, type)
        VALUES (@employee_id, @store_id, @date, @start_time, @end_time, @type)
    `);
    stmt.run(schedule);
}
