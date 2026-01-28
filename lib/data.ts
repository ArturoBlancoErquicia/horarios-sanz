import db from './db';

export interface Store {
    id: number;
    name: string;
    open_time_weekday: string;
    close_time_weekday: string;
    open_time_saturday?: string;
    close_time_saturday?: string;
    open_time_sunday?: string;
    close_time_sunday?: string;
}

export interface Employee {
    id: number;
    name: string;
    store_id: number;
    weekly_hours: number;
    rules: string;
}

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
