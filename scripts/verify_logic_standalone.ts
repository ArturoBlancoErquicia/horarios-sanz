
import { getStoreShifts } from '../lib/logic';
import { format } from 'date-fns';

// Mock Interfaces to match logic.ts expectations if it were strict, 
// but since we import logic, we rely on its types. 
// We just pass objects that satisfy the shape.

const employees = [
    // San Julian
    { id: 101, name: "CARMEN", store_id: 1, weekly_hours: 35, rules: "Turno: Mañana" },
    { id: 102, name: "NATALIA", store_id: 1, weekly_hours: 30, rules: "Turno: Tarde" },
    { id: 103, name: "MARIANIS", store_id: 1, weekly_hours: 5, rules: "Refuerzo" },
    // Castralvo
    { id: 201, name: "MAR", store_id: 2, weekly_hours: 40, rules: "" },
    { id: 203, name: "ESTHER M", store_id: 2, weekly_hours: 40, rules: "" },
    { id: 204, name: "VICKY", store_id: 2, weekly_hours: 30, rules: "" },
    { id: 205, name: "JORGE", store_id: 2, weekly_hours: 7.5, rules: "" },
    // Fuenfresca
    { id: 301, name: "YOLANDA", store_id: 3, weekly_hours: 35, rules: "" },
    { id: 302, name: "MARI", store_id: 3, weekly_hours: 30, rules: "" },
    { id: 303, name: "SABRINA", store_id: 3, weekly_hours: 5, rules: "" },
    { id: 304, name: "JORGE LÓPEZ", store_id: 3, weekly_hours: 5, rules: "" },
    // San Juan
    { id: 401, name: "ANGELA", store_id: 4, weekly_hours: 30, rules: "" },
    { id: 402, name: "ISABEL", store_id: 4, weekly_hours: 20, rules: "" },
    // Av Aragon
    { id: 501, name: "ESTHER P", store_id: 5, weekly_hours: 25, rules: "" }, // Esther P
    { id: 502, name: "KARLA", store_id: 5, weekly_hours: 20, rules: "" },
    // Sta Amalia
    { id: 601, name: "ASUN", store_id: 6, weekly_hours: 40, rules: "" },
    { id: 602, name: "BEA", store_id: 6, weekly_hours: 30, rules: "" },
    { id: 603, name: "VIOLETA", store_id: 6, weekly_hours: 15, rules: "" },
    { id: 604, name: "LARA", store_id: 6, weekly_hours: 5, rules: "" },
];

const stores = [
    { id: 1, name: "SAN JULIÁN", open_time_weekday: "08:00", close_time_weekday: "14:30", open_time_saturday: "08:00", close_time_saturday: "14:30", open_time_sunday: "08:00", close_time_sunday: "14:30" },
    { id: 2, name: "CASTRALVO", open_time_weekday: "07:00", close_time_weekday: "15:00", open_time_saturday: "07:00", close_time_saturday: "15:00", open_time_sunday: "07:00", close_time_sunday: "15:00" },
    { id: 3, name: "FUENFRESCA", open_time_weekday: "07:30", close_time_weekday: "14:30", open_time_saturday: "07:30", close_time_saturday: "14:30", open_time_sunday: "07:30", close_time_sunday: "14:30" },
    { id: 4, name: "SAN JUAN", open_time_weekday: "09:00", close_time_weekday: "15:15", open_time_saturday: "09:00", close_time_saturday: "14:45", open_time_sunday: "09:30", close_time_sunday: "14:45" },
    { id: 5, name: "AV ARAGON", open_time_weekday: "08:00", close_time_weekday: "14:15", open_time_saturday: "07:30", close_time_saturday: "14:15", open_time_sunday: "08:30", close_time_sunday: "14:15" },
    { id: 6, name: "SANTA AMALIA", open_time_weekday: "07:30", close_time_weekday: "14:45", open_time_saturday: "08:00", close_time_saturday: "14:45", open_time_sunday: "08:00", close_time_sunday: "14:45" }
];

const startDate = new Date('2026-02-02'); // A Monday (User's context)
console.log("Generating Shifts for Validation...");

stores.forEach(store => {
    console.log(`\n--- Store: ${store.name} ---`);
    let totalHours: { [key: string]: number } = {};

    for (let i = 0; i < 14; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        const shifts = getStoreShifts(store as any, date, employees as any, []);

        shifts.forEach(s => {
            if (!totalHours[s.emp]) totalHours[s.emp] = 0;
            // Simple duration calc (assuming standard format HH:mm - HH:mm)
            const parts = s.time.split(' - ');
            if (parts.length === 2) {
                const [h1, m1] = parts[0].split(':').map(Number);
                const [h2, m2] = parts[1].split(':').map(Number);
                const start = h1 + m1 / 60;
                const end = h2 + m2 / 60;
                totalHours[s.emp] += (end - start);
            }
        });
    }

    // Print summary
    for (const [emp, hours] of Object.entries(totalHours)) {
        console.log(`Employee: ${emp}, Total Hours (2 weeks): ${hours.toFixed(1)}, Weekly Avg: ${(hours / 2).toFixed(1)}`);
    }

    // Check for single-person days
    console.log("\n--- Coverage Check ---");
    for (let i = 0; i < 14; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        const shifts = getStoreShifts(store as any, date, employees as any, []);

        // Count standard/reinforcement shifts (exclude opening/closing if they are just markers, but here they are types)
        // Actually type is 'standard' | ...
        // We want to know how many people are working.
        if (shifts.length === 1 && !['DOMINGO', 'SÁBADO', 'SABADO'].includes(format(date, 'eeee').toUpperCase())) {
            // Ignore weekends if they are meant to be single person? 
            // User said "procure que el deficit cubra dias con 1 sola persona... procura que siempre haya dos".
            // So even weekends should have 2 if possible?
            // San Julian Sun: Carmen + Marianis (2).
            console.log(`[WARNING] Single person on ${format(date, 'yyyy-MM-dd')} (${format(date, 'eeee')}): ${shifts[0].emp}`);
        } else if (shifts.length === 1) {
            console.log(`[INFO] Single person on Weekend ${format(date, 'yyyy-MM-dd')}: ${shifts[0].emp}`);
        }
    }
});
