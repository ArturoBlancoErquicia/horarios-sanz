const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), 'horarios.db');
const db = new Database(dbPath);

console.log('Inicializando Esquema de Base de Datos...');

const schema = `
  CREATE TABLE IF NOT EXISTS stores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    open_time_weekday TEXT,
    close_time_weekday TEXT,
    open_time_saturday TEXT,
    close_time_saturday TEXT,
    open_time_sunday TEXT,
    close_time_sunday TEXT
  );

  CREATE TABLE IF NOT EXISTS employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    store_id INTEGER,
    weekly_hours REAL,
    rules TEXT, -- Reglas en texto libre o JSON por ahora
    FOREIGN KEY(store_id) REFERENCES stores(id)
  );

  CREATE TABLE IF NOT EXISTS schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER,
    store_id INTEGER,
    date TEXT, -- ISO YYYY-MM-DD
    start_time TEXT,
    end_time TEXT,
    type TEXT DEFAULT 'work', -- work, absence, reinforcement
    FOREIGN KEY(employee_id) REFERENCES employees(id),
    FOREIGN KEY(store_id) REFERENCES stores(id)
  );
`;

db.exec(schema);
console.log('Tablas creadas correctamente.');
