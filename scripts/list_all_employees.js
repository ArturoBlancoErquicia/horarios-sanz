const db = require('better-sqlite3')('horarios.db');
const employees = db.prepare('SELECT * FROM employees').all();
console.log('All Employees:', employees);
