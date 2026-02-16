import db from './db';

export interface Holiday {
    id: number;
    date: string; // YYYY-MM-DD
    name: string;
}

export function getAllHolidays(): Holiday[] {
    return db.prepare('SELECT * FROM holidays ORDER BY date ASC').all() as Holiday[];
}

export function addHoliday(date: string, name: string): void {
    const insert = db.prepare('INSERT OR IGNORE INTO holidays (date, name) VALUES (?, ?)');
    insert.run(date, name);
}

export function removeHoliday(id: number): void {
    const del = db.prepare('DELETE FROM holidays WHERE id = ?');
    del.run(id);
}
