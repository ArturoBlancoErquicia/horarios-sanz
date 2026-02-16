const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), 'horarios.db');
const db = new Database(dbPath);

const storeId = 46; // San Julian
const rows = db.prepare('SELECT * FROM employees WHERE store_id = ?').all(storeId);

console.log(`Employees for Store ${storeId}:`);
rows.forEach(r => console.log(` - ID: ${r.id}, Name: "${r.name}", Hours: ${r.weekly_hours}`));
