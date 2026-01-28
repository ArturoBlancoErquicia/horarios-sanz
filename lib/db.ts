import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'horarios.db');

interface CustomNodeJsGlobal {
    db: Database.Database | undefined;
}

declare const global: CustomNodeJsGlobal;

const db = global.db || new Database(dbPath, { verbose: console.log });
db.pragma('journal_mode = WAL');

if (process.env.NODE_ENV !== 'production') {
    global.db = db;
}

export default db;
