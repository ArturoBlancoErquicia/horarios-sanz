const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), 'horarios.db');
const db = new Database(dbPath);

console.log('Poblando base de datos con datos del Excel...');

// Datos extraídos manualmente del análisis del Excel
const stores = [
    { name: 'San Julián', open_l_d: '08:00-14:15' },
    { name: 'Castralvo', open_l_d: '07:00-14:30' },
    { name: 'Av. Aragón', open_l_v: '08:00-14:00', open_s: '07:30-14:00', open_d: '08:30-14:00' },
    { name: 'Sta. Amalia', open_l_v: '07:30-14:30', open_s_d: '08:00-14:30' },
    { name: 'Fuenfresca', open_l_d: '08:00-14:00' },
    { name: 'San Juan', open_l_d: '09:00-15:00' }
];

const employees = [
    // San Julián
    { name: 'Carmen', store: 'San Julián', hours: 35, rules: '35h semanales' },
    { name: 'Natalia', store: 'San Julián', hours: 25, rules: '25h semana, Miércoles va a Av. Aragón' },
    { name: 'Jorge L', store: 'San Julián', hours: 5, rules: '5h semana, Domingos 9:30-14:30' },

    // Castralvo
    { name: 'Mar', store: 'Castralvo', hours: 40, rules: '40h semanales' },
    { name: 'Rosa', store: 'Castralvo', hours: 40, rules: '40h semanales' },
    { name: 'Esther M.', store: 'Castralvo', hours: 30, rules: '30h semanales' },
    { name: 'Lara', store: 'Castralvo', hours: 6.5, rules: '6.5h semana, findes alternos' },

    // Av. Aragón
    { name: 'Esther P', store: 'Av. Aragón', hours: 25, rules: '25h semanales' },
    { name: 'M. Jose', store: 'Av. Aragón', hours: 20, rules: '20h semanales' },

    // Sta. Amalia
    { name: 'Asun', store: 'Sta. Amalia', hours: 40, rules: '40h semanales' },
    { name: 'Bea', store: 'Sta. Amalia', hours: 30, rules: '30h semanales, refuerzo con Asun' },
    { name: 'Imán', store: 'Sta. Amalia', hours: 13, rules: '13h semana, refuerzo findes alternos' },
    { name: 'Clara', store: 'Sta. Amalia', hours: 5, rules: '5h semana, findes alternos refuerzo' },

    // Fuenfresca
    { name: 'Yolanda', store: 'Fuenfresca', hours: 35, rules: '35h semanales' },
    { name: 'Mari', store: 'Fuenfresca', hours: 30, rules: '30h semanales' },
    { name: 'Judith', store: 'Fuenfresca', hours: 5, rules: '5h semana, findes alternos refuerzo' },
    { name: 'Paola', store: 'Fuenfresca', hours: 5, rules: '5h semana, findes alternos refuerzo' },

    // San Juan
    { name: 'Ángela', store: 'San Juan', hours: 30, rules: '30h semanales' },
    { name: 'Isabel', store: 'San Juan', hours: 20, rules: '20h semanales' }
];

const insertStore = db.prepare(`
  INSERT INTO stores (name, open_time_weekday, close_time_weekday)
  VALUES (@name, '08:00', '14:00') -- Simplificado por ahora, se ajustará
`);

const insertEmployee = db.prepare(`
  INSERT INTO employees (name, store_id, weekly_hours, rules)
  VALUES (@name, @storeId, @hours, @rules)
`);

const getStoreId = db.prepare('SELECT id FROM stores WHERE name = ?');

db.transaction(() => {
    // Insertar Tiendas
    for (const store of stores) {
        // Check if exists
        const existing = db.prepare('SELECT id FROM stores WHERE name = ?').get(store.name);
        if (!existing) {
            insertStore.run({ name: store.name });
        }
    }

    // Insertar Empleados
    for (const emp of employees) {
        const storeRow = getStoreId.get(emp.store);
        if (storeRow) {
            // Check if exists
            const existingEmp = db.prepare('SELECT id FROM employees WHERE name = ?').get(emp.name);
            if (!existingEmp) {
                insertEmployee.run({
                    name: emp.name,
                    storeId: storeRow.id,
                    hours: emp.hours,
                    rules: emp.rules
                });
            }
        } else {
            console.warn(`Tienda no encontrada para empleado: ${emp.name} (${emp.store})`);
        }
    }
})();

console.log('Datos de semilla insertados exitosamente.');
