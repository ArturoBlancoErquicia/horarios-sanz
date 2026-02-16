const { getISOWeek, getDay, format } = require('date-fns');

// Mock Data
const employees = [
    { id: 101, name: "CARMEN", weekly_hours: 35 },
    { id: 102, name: "NATALIA", weekly_hours: 25 },
    { id: 103, name: "JORGE L", weekly_hours: 5 }
];

const store = {
    name: "SAN JULIÁN",
    open_time_sunday: "08:00",
    close_time_sunday: "14:30"
};

// Logic Simulation
function isEvenWeek(date) {
    return getISOWeek(date) % 2 === 0;
}

function findEmp(employees, namePart) {
    return employees.find(e => e.name.toUpperCase().includes(namePart.toUpperCase()));
}

function getSanJulianShifts(date, day) {
    const carmen = findEmp(employees, 'CARMEN');
    const natalia = findEmp(employees, 'NATALIA');
    const jorge = findEmp(employees, 'JORGE');

    const shifts = [];
    const openClose = "08:00 - 14:30";

    if (day === 0) {
        // Alternating Weekend Main: Carmen vs Natalia
        const mainEmp = isEvenWeek(date) ? natalia : carmen;
        console.log(`Date: ${format(date, 'yyyy-MM-dd')}, Week: ${getISOWeek(date)}, Even: ${isEvenWeek(date)}, Main: ${mainEmp ? mainEmp.name : 'NONE'}`);

        if (mainEmp) shifts.push({ emp: mainEmp.name, time: openClose, type: 'standard' });

        // Refuerzo: Jorge L
        if (jorge) shifts.push({ emp: jorge.name, time: '09:30 - 14:30', type: 'reinforcement' });
        return shifts;
    }
    return [];
}

// Test Dates
const sept6 = new Date('2026-09-06T12:00:00'); // Sunday
const sept13 = new Date('2026-09-13T12:00:00'); // Sunday

console.log("--- Sept 6 ---");
console.log(getSanJulianShifts(sept6, 0));

console.log("--- Sept 13 ---");
console.log(getSanJulianShifts(sept13, 0));
