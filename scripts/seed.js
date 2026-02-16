const Database = require('better-sqlite3');
const path = require('path');
const XLSX = require('xlsx');

const dbPath = path.join(process.cwd(), 'horarios.db');
const db = new Database(dbPath);
const filePath = path.join(process.cwd(), 'HORARIOScsv.csv');

console.log(`Reading Excel file: ${filePath}`);

try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    // Read ALL rows
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    console.log(`Total rows found: ${data.length}`);

    // DB Statements
    // We recreate tables just to be sure (optional, or just delete content)
    db.prepare('DELETE FROM employees').run();
    db.prepare('DELETE FROM stores').run();

    const insertStore = db.prepare(`
        INSERT INTO stores (name, open_time_weekday, close_time_weekday, open_time_saturday, close_time_saturday, open_time_sunday, close_time_sunday)
        VALUES (@name, @open, @close, @open_sat, @close_sat, @open_sun, @close_sun)
    `);

    const insertEmployee = db.prepare(`
        INSERT INTO employees (name, store_id, weekly_hours, rules)
        VALUES (@name, @storeId, @hours, @rules)
    `);

    let currentStoreId = null;
    let currentStoreName = null;

    // RegEx
    // Store names usually UPPERCASE in column 0: "SAN JULIAN", "CASTRALVO"
    // Employee: "CARMEN(35H SEMANALES)" or "YOLANDA" in col 1

    // We iterate rows
    for (const row of data) {
        let col0 = (row[0] || '').toString().trim(); // Store Name?
        let col1 = (row[1] || '').toString().trim(); // Employee Name + details
        let col2 = (row[2] || '').toString().trim(); // Sometimes hours here

        // Detect Store
        // Heuristic: Col0 appears, Col1 is empty or Col0 is strictly uppercase
        // Ignoring "LUNES...", "JORNADAS..."
        if (col0 && col0.length > 3 && !col0.toUpperCase().startsWith('LUNES') && !col0.toUpperCase().startsWith('JORNADAS') && !col0.toUpperCase().includes('HORARIOS') && !col0.toUpperCase().includes('TIENDA')) {
            // New Store found
            currentStoreName = col0;

            // Normalize helper
            const normalize = (str) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();

            // Check if store already exists (Deduplication with accent support)
            const allStores = db.prepare('SELECT id, name FROM stores').all();
            const existingStore = allStores.find(s => normalize(s.name) === normalize(currentStoreName));

            if (existingStore) {
                console.log(`   -> Found duplicate Store entry: ${currentStoreName} (Matches: ${existingStore.name}). Appending data.`);
                currentStoreId = existingStore.id;
            } else {
                console.log(`Found New Store: ${currentStoreName}`);

                // Define Schedule Rules based on User Input
                const NORM_NAME = normalize(currentStoreName);
                let schedule = {
                    open_weekday: '08:00', close_weekday: '14:00',
                    open_saturday: '08:00', close_saturday: '14:00',
                    open_sunday: null, close_sunday: null // Closed by default
                };

                // Specific Rules
                if (NORM_NAME.includes('JULIAN')) { // SAN JULIÁN
                    schedule = {
                        open_weekday: '08:00', close_weekday: '14:30',
                        open_saturday: '08:00', close_saturday: '14:30',
                        open_sunday: '08:00', close_sunday: '14:30'
                    };
                } else if (NORM_NAME.includes('CASTRALVO')) { // CASTRALVO
                    schedule = {
                        open_weekday: '07:00', close_weekday: '15:00',
                        open_saturday: '07:00', close_saturday: '15:00',
                        open_sunday: '07:00', close_sunday: '15:00'
                    };
                } else if (NORM_NAME.includes('ARAGON')) { // AV. ARAGÓN
                    schedule = {
                        open_weekday: '08:00', close_weekday: '14:15',
                        open_saturday: '07:30', close_saturday: '14:15',
                        open_sunday: '08:30', close_sunday: '14:15'
                    };
                } else if (NORM_NAME.includes('AMALIA')) { // STA. AMALIA
                    schedule = {
                        open_weekday: '07:30', close_weekday: '14:45',
                        open_saturday: '08:00', close_saturday: '14:45',
                        open_sunday: '08:00', close_sunday: '14:45'
                    };
                } else if (NORM_NAME.includes('FUENFRESCA')) { // FUENFRESCA
                    schedule = {
                        open_weekday: '07:30', close_weekday: '14:30',
                        open_saturday: '07:30', close_saturday: '14:30',
                        open_sunday: '07:30', close_sunday: '14:30'
                    };
                } else if (NORM_NAME.includes('JUAN')) { // SAN JUAN
                    schedule = {
                        open_weekday: '09:00', close_weekday: '15:15',
                        open_saturday: '09:00', close_saturday: '14:45',
                        open_sunday: '09:30', close_sunday: '14:45'
                    };
                }

                // Insert Store
                const result = insertStore.run({
                    name: currentStoreName,
                    open: schedule.open_weekday,
                    close: schedule.close_weekday,
                    open_sat: schedule.open_saturday,
                    close_sat: schedule.close_saturday,
                    open_sun: schedule.open_sunday,
                    close_sun: schedule.close_sunday
                });
                currentStoreId = result.lastInsertRowid;
            }
            // DO NOT continue, check for employee on same row
        }

        // Detect Employee
        // Must have a current store
        // Check if there is content in Col1 (most cases) OR Col2 (some cases where Col0 is empty)
        // If we just found a store (Col0 non-empty), we only check Col1.
        if (currentStoreId) {
            let name = '';
            let hoursText = '';
            let rules = '';

            // Case A: content in col1 (Standard)
            if (col1) {
                name = col1;
                hoursText = col1;
                rules = col1;
            }
            // Case B: content in col2 (Split columns: Name | Hours) - Only if not a Store Row usually?
            // Actually Fuenfresca: [ "FUENFRESCA", "YOLANDA", "35 HORAS" ] -> Row detected store. Col1 is YOLANDA.
            // So if col1 is Name, and col2 is Hours.
            if (col2 && col2.toUpperCase().includes('HORAS')) {
                // If col1 was also present, it's the name.
                // If col1 was empty, name might be in col0? No col0 is Store.
                if (col1) {
                    hoursText = col2;
                    rules = col2;
                }
            }

            if (!name) continue;

            // Clean Name: remove parenthesis details
            const nameMatch = name.match(/^([^(]+)/);
            if (nameMatch) {
                name = nameMatch[1].trim();
            }

            // FILTER: Ignore noise
            // Times (contain :)
            if (name.includes(':')) continue;
            // Holidays / Cierres
            const blacklist = ['CIERRES', 'AÑO', 'REYES', 'NAVIDAD', 'VAQUILLAS', 'MARTES', 'JUEVES', 'VIERNES'];
            if (blacklist.some(b => name.toUpperCase().includes(b))) continue;
            // Generic text
            if (name.length > 30 || name.toLowerCase().includes('refuerzo') || name.toLowerCase().includes('fin de semana')) continue;

            // Extract Hours
            let weeklyHours = 0;
            const hoursMatch = hoursText.match(/(\d+([.,]\d+)?)\s*(H|HORAS)/i);
            if (hoursMatch) {
                weeklyHours = parseFloat(hoursMatch[1].replace(',', '.'));
            }

            // Filter out 0 hours if name looks suspicious or is just a text row? 
            // Valid employees might have 0 hours if not specified, but usually they have (X H).
            // Let's keep them if name passed other filters, but log warning.

            if (name && name.length > 1) {
                console.log(`   -> Employee: ${name} (${weeklyHours}h)`);
                insertEmployee.run({
                    name: name,
                    storeId: currentStoreId,
                    hours: weeklyHours,
                    rules: rules
                });
            }
        }
    }

    console.log('Database successfully re-seeded from Excel!');

} catch (error) {
    console.error('Error seeding database:', error);
}
