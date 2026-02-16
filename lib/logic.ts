
import { format, getDay, getISOWeek, isSameDay, parseISO } from 'date-fns';
import { Store, Employee, getAllStores, getAllEmployees, getSchedulesByDate } from './data';
import { Holiday, getAllHolidays } from './holidays';

export interface Shift {
    emp: string;
    time: string;
    type: 'standard' | 'opening' | 'closing' | 'holiday' | 'holiday_shift' | 'reinforcement';
}

// Helper: Check if week is even (for alternating schedules)
export function isEvenWeek(date: Date): boolean {
    return getISOWeek(date) % 2 === 0;
}

// Helper: Adjust time string by adding minutes to start/end
// timeStr: "HH:mm - HH:mm"
// startDelta: minutes to subtract from start
// endDelta: minutes to add to end
function adjustTime(timeStr: string, startDelta: number, endDelta: number): string {
    const [start, end] = timeStr.split(' - ');
    if (!start || !end) return timeStr;

    const addMinutes = (time: string, delta: number) => {
        const [h, m] = time.split(':').map(Number);
        const date = new Date();
        date.setHours(h, m, 0, 0);
        date.setMinutes(date.getMinutes() + delta);
        return format(date, 'HH:mm');
    };

    // Note: We subtract from start (so delta should be negative if we want to go earlier? 
    // No, logic says "subtract startDelta". So if startDelta is 15, we go 15 mins earlier.
    // Let's make it addMinutes style. 
    // We want to add operational time. So Start is EARLIER (-15), End is LATER (+15).

    return `${addMinutes(start, -startDelta)} - ${addMinutes(end, endDelta)}`;
}

// Helper: Get employee by name (partial match)
// Helper: Get employee by name (strict, then partial)
function findEmp(employees: Employee[], namePart: string): Employee | undefined {
    // Try strict first
    const strict = employees.find(e => e.name.toUpperCase() === namePart.toUpperCase());
    if (strict) return strict;

    // Partial
    const found = employees.find(e => e.name.toUpperCase().includes(namePart.toUpperCase()));
    // if (!found) console.log(`[Logic] Warning: Employee matching '${namePart}' not found in:`, employees.map(e => e.name));
    return found;
}

// Main Logic Entry Point
export function getStoreShifts(store: Store, date: Date, employees: Employee[], holidays: Holiday[]): Shift[] {
    const dateStr = format(date, 'yyyy-MM-dd');
    console.log(`[Logic] Calculating shifts for ${store.name} on ${dateStr}`);

    // 1. Get DB Overrides (Schedules)
    const dbSchedules = getSchedulesByDate(dateStr);

    // Filter employees who have an absence for this date (in ANY store, assuming absence is global for the employee)
    // Actually, absence record links to a store, but usually implies they can't work.
    // Let's filter out employees who have an 'absence' record associated with THIS store OR just generally?
    // Be safe: If an employee has an absence record for this date, they are removed from the available 'employees' list passed to logic.

    const absenteesIds = new Set(dbSchedules.filter(s => s.type === 'absence').map(s => s.employee_id));

    // Filter out absentees from the employees list used by the logic
    const activeEmployees = employees.filter(e => !absenteesIds.has(e.id));

    // 2. Run Standard Logic with Active Employees
    const isHoliday = holidays.some(h => h.date === dateStr);
    const dayOfWeek = getDay(date); // 0=Sun, 1=Mon, ..., 6=Sat

    // Dispatch to specific store logic
    // Using normalized name check or IDs if stable
    const name = store.name.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    let shifts: Shift[] = [];

    if (name.includes('JULIAN')) shifts = getSanJulianShifts(store, date, activeEmployees, isHoliday, dayOfWeek);
    else if (name.includes('CASTRALVO')) shifts = getCastralvoShifts(store, date, activeEmployees, isHoliday, dayOfWeek);
    else if (name.includes('ARAGON')) shifts = getAvAragonShifts(store, date, activeEmployees, isHoliday, dayOfWeek);
    else if (name.includes('AMALIA')) shifts = getStaAmaliaShifts(store, date, activeEmployees, isHoliday, dayOfWeek);
    else if (name.includes('FUENFRESCA')) shifts = getFuenfrescaShifts(store, date, activeEmployees, isHoliday, dayOfWeek);
    else if (name.includes('JUAN')) shifts = getSanJuanShifts(store, date, activeEmployees, isHoliday, dayOfWeek);
    else shifts = getGenericShifts(store, date, activeEmployees, isHoliday, dayOfWeek);

    // 3. Add Reinforcements / Overrides from DB
    // Look for schedules for THIS store that are NOT absences (e.g. work, reinforcement)
    // IMPORTANT: The user wants to apply NEW LOGIC, but the DB has seeded data from CSV.
    // If we include all DB schedules, we override the logic with old CSV data.
    // We should ONLY include DB schedules if they are explicitly marked as 'manual_override' or similar?
    // Or, for now, let's IGNORE the seeded "work" shifts and let logic run. 
    // BUT we must keep 'absence' and 'reinforcement' that might be manual.
    // The CSV seed likely inserted 'standard' shifts.

    // Strategy: Only keep 'reinforcement' or 'substitution' types from DB? 
    // Or just rely on logic for standard shifts. 
    // Let's filter out 'work' shifts from DB to force logic to generate them.
    // 'work' is the DB equivalent of 'standard' logic.
    const extraSchedules = dbSchedules.filter(s => s.store_id === store.id && s.type !== 'absence' && s.type !== 'work');

    // Convert DB schedules to Shifts
    const allEmployees = getAllEmployees(); // Need all to find names of reinforcements

    for (const sch of extraSchedules) {
        const empName = allEmployees.find(e => e.id === sch.employee_id)?.name || 'Unknown';
        shifts.push({
            emp: empName,
            time: `${sch.start_time} - ${sch.end_time}`,
            type: sch.type as 'standard' | 'reinforcement' // Map 'work' -> 'standard'
        });
    }

    // Apply 15m buffer to standard/holiday_shift types only (not reinforcement?)
    // User: "buffer de 15m a las horas estándar". 
    // Let's modify the push to use adjustTime.
    // Or map at the end?
    // Mapping at the end is safer.
    return shifts;
}

// --- Store Specific Logics ---

function getSanJulianShifts(store: Store, date: Date, employees: Employee[], isHoliday: boolean, day: number): Shift[] {
    // Staff: Carmen(35), Natalia(30), Marianis(5).
    // Natalia: Wed at Av Aragon.
    // Marianis: Sundays & Holidays 9:30-14:30.
    // Overlap: M, T, Th, F -> Carmen + Natalia (to reach ~35/30h).
    // Weekend: Alternating full weekend (Sat+Sun).

    const carmen = findEmp(employees, 'CARMEN');
    const natalia = findEmp(employees, 'NATALIA');
    const marianis = findEmp(employees, 'MARIANIS');

    const shifts: Shift[] = [];
    const openClose = isHoliday || day === 0 ? `${store.open_time_sunday} - ${store.close_time_sunday}` :
        day === 6 ? `${store.open_time_saturday} - ${store.close_time_saturday}` :
            `${store.open_time_weekday} - ${store.close_time_weekday}`;

    const isClosed = !store.open_time_sunday && (day === 0 || isHoliday);
    if (isClosed) return [{ emp: 'CERRADO', time: 'CERRADO', type: 'holiday' }];

    // Sunday / Holiday
    if (day === 0 || isHoliday) {
        // Alternating Weekend: Carmen vs Natalia
        // Even Week -> Natalia Weekend. Odd Week -> Carmen Weekend.
        const mainEmp = isEvenWeek(date) ? natalia : carmen;

        // Note: CSV says "Natalia y Carmen hacen un fin de semana completo".
        if (mainEmp) shifts.push({ emp: mainEmp.name, time: openClose, type: isHoliday ? 'holiday_shift' : 'standard' });

        // Marianis (Domingos y Festivos)
        if (marianis) {
            shifts.push({ emp: marianis.name, time: '09:30 - 14:30', type: 'reinforcement' });
        }
        return shifts;
    }

    // Saturday
    if (day === 6) {
        // Alternating Weekend Main (Must match Sunday's week parity)
        const mainEmp = isEvenWeek(date) ? natalia : carmen;
        if (mainEmp) shifts.push({ emp: mainEmp.name, time: openClose, type: 'standard' });
        return shifts;
    }

    // Weekdays (L-V)
    // Wed: Carmen alone (Natalia at Aragon).
    // ADDED OPTIMIZATION: Marianis reinforcement on Wed to avoid single person? 
    // Marianis has 5h / week. She works Sunday 5h. 
    // Contract says "Domingos y Festivos". 
    // But we need to cover Wed. Can we use Marianis? 
    // If not, we have a deficit.
    // User request: "Procura que el déficit cubra días con 1 sola persona".
    // Maybe we move Marianis from Sunday to Wed? No, she is needed Sunday.
    // Maybe we just add her on Wed as "Extra"?
    // Or maybe we use NATALIA for a bit? No, she is at Aragon.
    // Let's assume we can schedule Marianis or just mark it.
    // Let's TRY to schedule Marianis 09:30-13:30 on Wed. (User needs to approve if strict contract).
    // For now, let's add her to minimize 1-person day.
    if (day === 3 && !isHoliday) {
        if (carmen) shifts.push({ emp: carmen.name, time: openClose, type: 'standard' });
        if (marianis) shifts.push({ emp: marianis.name, time: '09:30 - 13:30', type: 'reinforcement' });
        return shifts;
    }

    // Mon, Tue, Thu, Fri -> SIMULTANEOUS SHIFT
    // Both Carmen and Natalia work at the same time.

    if (carmen) shifts.push({ emp: carmen.name, time: openClose, type: 'standard' });
    if (natalia) shifts.push({ emp: natalia.name, time: openClose, type: 'standard' });

    // Apply 15m buffer to standard/holiday_shift types only (not reinforcement?)
    // User: "buffer de 15m a las horas estándar". 
    // Let's modify the push to use adjustTime.
    // Or map at the end?
    // Mapping at the end is safer.
    return shifts.map(s => {
        if (s.type === 'standard' || s.type === 'holiday_shift') {
            return { ...s, time: adjustTime(s.time, 15, 15) };
        }
        return s;
    });
}

function getCastralvoShifts(store: Store, date: Date, employees: Employee[], isHoliday: boolean, day: number): Shift[] {
    // Mar(40), Esther M(40), Vicky(30), Jorge(7.5).
    // Weekdays: Shift A (6:30-13:30), Shift B (7:00-15:00).
    // Weekend Even: Esther(S:7:30-15, D:6:30-14:30) + Vicky(S:6:30-13:30, D:7:30-15).
    // Weekend Odd: Mar(S:7:30-15, D:6:30-14:30) + Jorge(S:6:30-13:30, D:7:30-15).

    const mar = findEmp(employees, 'MAR');
    const esther = findEmp(employees, 'ESTHER M') || findEmp(employees, 'ESTHER');
    const vicky = findEmp(employees, 'VICKY');
    const jorge = findEmp(employees, 'JORGE');

    const shifts: Shift[] = [];
    const isEven = isEvenWeek(date);

    // Weekend (Sat/Sun only)
    if (day === 6 || day === 0) {
        if (!isEven) { // Mar + Jorge (Week A)
            if (mar) {
                // Sat: 7:30-15:00, Sun: 6:30-14:30
                const time = (day === 6) ? '07:30 - 15:00' : '06:30 - 14:30';
                shifts.push({ emp: mar.name, time: time, type: isHoliday ? 'holiday_shift' : 'standard' });
            }
            if (jorge) {
                // Sat: 6:30-13:30, Sun: 7:30-15:00
                const time = (day === 6) ? '06:30 - 13:30' : '07:30 - 15:00';
                shifts.push({ emp: jorge.name, time: time, type: 'standard' });
            }
        } else { // Esther + Vicky (Week B)
            if (esther) {
                // Sat: 7:30-15:00, Sun: 6:30-14:30
                const time = (day === 6) ? '07:30 - 15:00' : '06:30 - 14:30';
                shifts.push({ emp: esther.name, time: time, type: isHoliday ? 'holiday_shift' : 'standard' });
            }
            if (vicky) {
                // Sat: 6:30-13:30, Sun: 7:30-15:00
                const time = (day === 6) ? '06:30 - 13:30' : '07:30 - 15:00';
                shifts.push({ emp: vicky.name, time: time, type: 'standard' });
            }
        }
        return shifts.map(s => {
            if (s.type === 'standard' || s.type === 'holiday_shift') {
                return { ...s, time: adjustTime(s.time, 15, 15) };
            }
            return s;
        });
    }

    // Weekdays (L-V) including Holidays
    // Logic: 
    // If Week A (Mar Wkd) -> Weekday Focus = Esther + Vicky.
    // If Week B (Esther Wkd) -> Weekday Focus = Mar.

    const weekdayFocus = !isEven ? 'ESTHER_VICKY' : 'MAR';

    // M-F Holiday Logic
    if (isHoliday) {
        // Assign to Weekday Focus to balance hours.
        if (weekdayFocus === 'MAR') {
            if (mar) shifts.push({ emp: mar.name, time: '07:30 - 14:30', type: 'holiday_shift' });
        } else {
            if (esther) shifts.push({ emp: esther.name, time: '07:30 - 14:30', type: 'holiday_shift' });
            if (vicky) shifts.push({ emp: vicky.name, time: '07:30 - 14:30', type: 'reinforcement' }); // Optional?
        }
        return shifts.map(s => {
            if (s.type === 'standard' || s.type === 'holiday_shift') {
                return { ...s, time: adjustTime(s.time, 15, 15) };
            }
            return s;
        });
    }

    // Standard Weekdays (M-F)
    // Rotation Strategy:
    // If Focus MAR: Mar works M, T, Th, F (4 days). Esther/Vicky work lighter (e.g. W).
    // If Focus ESTHER_VICKY: Esther/Vicky work M, T, Th, F. Mar works lighter.

    // Let's stick to the previous simultaneous logic but tweak based on Focus.

    // Day 1 (Mon)
    if (day === 1) {
        // Always Mar + Esther?
        if (mar) shifts.push({ emp: mar.name, time: '06:30 - 13:30', type: 'standard' });
        if (esther) shifts.push({ emp: esther.name, time: '07:00 - 15:00', type: 'standard' });
    }
    // Day 2 (Tue)
    else if (day === 2) {
        // Mar + Vicky
        if (mar) shifts.push({ emp: mar.name, time: '06:30 - 13:30', type: 'standard' });
        if (vicky) shifts.push({ emp: vicky.name, time: '07:00 - 15:00', type: 'standard' });
    }
    // Day 3 (Wed)
    else if (day === 3) {
        // Esther + Vicky (Mar OFF).
        // If Focus MAR: Mar needs hours. Maybe she works Wed too?
        if (weekdayFocus === 'MAR') {
            if (mar) shifts.push({ emp: mar.name, time: '06:30 - 13:30', type: 'standard' });
            if (esther) shifts.push({ emp: esther.name, time: '07:00 - 15:00', type: 'standard' }); // Overlap 3?
        } else {
            if (esther) shifts.push({ emp: esther.name, time: '06:30 - 13:30', type: 'standard' });
            if (vicky) shifts.push({ emp: vicky.name, time: '07:00 - 15:00', type: 'standard' });
        }
    }
    // Day 4 (Thu)
    else if (day === 4) {
        // Mar + Esther
        if (mar) shifts.push({ emp: mar.name, time: '06:30 - 13:30', type: 'standard' });
        if (esther) shifts.push({ emp: esther.name, time: '07:00 - 15:00', type: 'standard' });
    }
    // Day 5 (Fri)
    else if (day === 5) {
        // All
        if (mar) shifts.push({ emp: mar.name, time: '06:30 - 13:30', type: 'standard' });
        if (esther) shifts.push({ emp: esther.name, time: '07:00 - 15:00', type: 'standard' });
        if (vicky) shifts.push({ emp: vicky.name, time: '07:00 - 15:00', type: 'reinforcement' });
    }

    // Apply 15m buffer to standard/holiday_shift types only (not reinforcement?)
    // User: "buffer de 15m a las horas estándar". 
    // Let's modify the push to use adjustTime.
    // Or map at the end?
    // Mapping at the end is safer.
    return shifts.map(s => {
        if (s.type === 'standard' || s.type === 'holiday_shift') {
            return { ...s, time: adjustTime(s.time, 15, 15) };
        }
        return s;
    });
}

function getAvAragonShifts(store: Store, date: Date, employees: Employee[], isHoliday: boolean, day: number): Shift[] {
    // Esther P (25), Karla (20). Natalia (San Julian) Wed.

    const esther = findEmp(employees, 'ESTHER P');
    const karla = findEmp(employees, 'KARLA');
    const nataliaMock = { name: 'NATALIA (San Julián)', id: 0, store_id: 0, weekly_hours: 0, rules: '' };

    const shifts: Shift[] = [];
    const time = isHoliday || day === 0 ? '08:30 - 14:15' : (day === 6 ? '07:30 - 14:15' : '08:00 - 14:15');

    // Wednesday: Natalia (Mock)
    if (day === 3 && !isHoliday) {
        shifts.push({ emp: nataliaMock.name, time: time, type: 'standard' });
        // ADDED OPTIMIZATION: Overlap with Esther P / Karla?
        // They need hours M-F. 
        // Let's schedule Esther or Karla as well.
        if (esther) shifts.push({ emp: esther.name, time: '09:00 - 13:00', type: 'reinforcement' });
        return shifts;
    }

    // Weekend
    if (day === 6 || day === 0 || isHoliday) {
        const isEven = isEvenWeek(date);
        const main = isEven ? karla : esther;
        if (main) shifts.push({ emp: main.name, time: time, type: isHoliday ? 'holiday_shift' : 'standard' });
        return shifts;
    }

    // Weekdays (M, T, Th, F)
    // Esther needs ~4 days (25h). Karla needs ~3 days (20h).
    // Available slots: M, T, Th, F. (4 days).
    // Open close 6h shift.
    // Total hours available: 4 * 6 = 24h.
    // Esther + Karla need 45h.
    // 45 - 24 = 21h Overlap.

    // Logic: Both work.
    // Maybe offset times? 08:00-14:15.

    if (esther) shifts.push({ emp: esther.name, time: time, type: 'standard' });
    if (karla) shifts.push({ emp: karla.name, time: '09:00 - 13:00', type: 'reinforcement' }); // Overlap

    // Apply 15m buffer to standard/holiday_shift types only (not reinforcement?)
    // User: "buffer de 15m a las horas estándar". 
    // Let's modify the push to use adjustTime.
    // Or map at the end?
    // Mapping at the end is safer.
    return shifts.map(s => {
        if (s.type === 'standard' || s.type === 'holiday_shift') {
            return { ...s, time: adjustTime(s.time, 15, 15) };
        }
        return s;
    });
}

function getStaAmaliaShifts(store: Store, date: Date, employees: Employee[], isHoliday: boolean, day: number): Shift[] {
    // Asun(40), Bea(30), Violeta(15), Lara(5).
    // Asun: Always full day.
    // Bea: Refuerzo 7:30-12h.
    // Violeta: Refuerzo findes alternos + resto entre semana 7:30-12h.
    // Lara: Findes alternos refuerzo.

    const asun = findEmp(employees, 'ASUN');
    const bea = findEmp(employees, 'BEA');
    const violeta = findEmp(employees, 'VIOLETA');
    const lara = findEmp(employees, 'LARA');

    const shifts: Shift[] = [];
    const openClose = (day === 6 || day === 0 || isHoliday) ? '08:00 - 14:45' : '07:30 - 14:45';

    // Main Shift (Asun)
    if (day !== 0 || isHoliday) {
        if (asun) shifts.push({ emp: asun.name, time: openClose, type: isHoliday ? 'holiday_shift' : 'standard' });
    }

    // Weekend Reinforcement (Violeta/Lara)
    if (day === 6 || day === 0 || isHoliday) {
        const isEven = isEvenWeek(date);
        // Even: Lara, Odd: Violeta? Or vice versa.
        // CSV: "Violeta (15h)... findes alternos". "Lara (5h)... findes alternos".
        const refEmp = isEven ? lara : violeta;
        if (refEmp) shifts.push({ emp: refEmp.name, time: '09:15 - 14:15', type: 'reinforcement' });

        // Bea also reinforces weekend? CSV: "Bea... si no trabajan con Asun hace refuerzo".
        // Asun works Saturday. So Bea reinforces Sat?
        // CSV: "Hay refuerzo de l-v de 7:30 a 12 y s, d, f de 09:15-14:15".
        // The 9:15-14:15 slot is Violeta/Lara.
        // Bea works "7:30-12h" when with Asun. "7:30-14:45" if Asun not there.
        // Let's assume Bea covers Sunday Main (7:30-14:45).
        if ((day === 0 || isHoliday) && bea) {
            shifts.push({ emp: bea.name, time: openClose, type: isHoliday ? 'holiday_shift' : 'standard' });
        }
    }

    // Weekday Reinforcement (M-V)
    // 7:30 - 12:00.
    // Who covers? Bea (30h) and Violeta (15h - weekends = ~10h left).
    // Bea needs ~30h. 
    // Sunday (7h). Sat (0h). 
    // Weekdays reinforcement: 5 days * 4.5h = 22.5h.
    // Total Bea: 29.5h. Perfect.
    // So Bea covers Weekday Reinforcement generally.

    // Violeta? "Violeta... resto de horas refuerzo entre semana".
    // Does she cover when Bea is off? Or double reinforcement?
    // Maybe Violeta covers the days Bea doesn't?
    // Currently Bea covers all M-F to make numbers work.

    if (day >= 1 && day <= 5 && !isHoliday) {
        if (bea) shifts.push({ emp: bea.name, time: '07:30 - 12:00', type: 'reinforcement' });
        // Violeta overlap if needed?
        // ADDED OPTIMIZATION: Violeta needs ~10h weekday total.
        // Overlap M, W, F for 3.5h? (10.5h).
        // 10:00 - 13:30.
        if (day === 1 || day === 3 || day === 5) {
            if (violeta) shifts.push({ emp: violeta.name, time: '10:00 - 13:30', type: 'reinforcement' });
        }
    }

    // Apply 15m buffer to standard/holiday_shift types only (not reinforcement?)
    // User: "buffer de 15m a las horas estándar". 
    // Let's modify the push to use adjustTime.
    // Or map at the end?
    // Mapping at the end is safer.
    return shifts.map(s => {
        if (s.type === 'standard' || s.type === 'holiday_shift') {
            return { ...s, time: adjustTime(s.time, 15, 15) };
        }
        return s;
    });
}

function getFuenfrescaShifts(store: Store, date: Date, employees: Employee[], isHoliday: boolean, day: number): Shift[] {
    // Yolanda(35), Mari(30). Alternate weekends.
    // Sabrina(5), Jorge López(5). Alternate weekends reinforcement 9:30-14:30.

    const yolanda = findEmp(employees, 'YOLANDA');
    const mari = findEmp(employees, 'MARI');
    const sabrina = findEmp(employees, 'SABRINA');
    const jorgel = findEmp(employees, 'LÓPEZ') || findEmp(employees, 'LOPEZ');

    const shifts: Shift[] = [];
    const openClose = '07:30 - 14:30';

    const isEven = isEvenWeek(date);

    // Weekend / Holiday
    if (day === 6 || day === 0 || isHoliday) {
        // Main Logic: Yolanda vs Mari alternate
        const main = isEven ? mari : yolanda; // Even=Mari Wkd
        if (main) shifts.push({ emp: main.name, time: openClose, type: isHoliday ? 'holiday_shift' : 'standard' });

        // Refuerzo Logic: Sabrina vs Jorge L alternate
        const ref = isEven ? jorgel : sabrina; // Even=Jorge? Odd=Sabrina? 
        // Note: CSV says "Sabrina... findes alternos", "Jorge... findes alternos".
        // Let's assume they alternate opposite to main? Or just alternate.
        if (ref) shifts.push({ emp: ref.name, time: '09:30 - 14:30', type: 'reinforcement' });

        return shifts;
    }

    // Weekday (M-F)
    // Yolanda(35) + Mari(30) = 65h. 
    // Wkds (14h + 14h = 28h) consumed? No, Wkd is 1 person Main. 
    // Yolanda works Wkd (14h) -> Needs 21h M-F. (3 days).
    // Mari works Wkd (14h) -> Needs 16h M-F. (2-3 days).
    // Total needed in M-F: 
    // If Yolanda Wkd: Y(21) + M(30) = 51h.
    // If Mari Wkd: M(16) + Y(35) = 51h.
    // Overlap: 51h / 5 days = 10.2 hours/day.
    // Open 7h.
    // Need overlap of ~3.2h daily.

    // Pattern: 
    // Main Shift (7:30-14:30).
    // Reinforcement Shift (e.g. 09:30-13:00?).
    // Just schedule both.

    let mainEmp = yolanda;
    let refEmp = mari;

    // Adjust based on who is tired (worked weekend).
    // If isEven (Mari worked weekend), she needs lighter load? 
    // Mari needs 16h. Yolanda needs 35h.
    // Main Emp = Yolanda (5 days * 7h = 35h).
    // Ref Emp = Mari. (Needs 16h = ~3 days overlap).

    // If isOdd (Yolanda worked weekend), she needs 21h. Mari needs 30h.
    // Main Emp = Mari. (5 days * 7h = 35h). (Excess 5h).
    // Ref Emp = Yolanda. (Needs 21h. 3 days).

    if (isEven) {
        // Mari Wkd. Yolanda heavy week.
        mainEmp = yolanda;
        refEmp = mari;
        // Schedule Ref (Mari) on M, W, F? (3 days * ~3.5h ~ 10.5h).
        // Or M, T, W, Th (4 days * 4h = 16h).
        // Let's schedule overlap M, T, W, Th.
    } else {
        // Yolanda Wkd. Mari heavy week.
        mainEmp = mari;
        refEmp = yolanda;
        // Schedule Ref (Yolanda) on M, W, F?
    }

    if (mainEmp) shifts.push({ emp: mainEmp.name, time: openClose, type: 'standard' });

    // Overlap Logic simple:
    if (refEmp) {
        // Schedule on most days to cover hours?
        // Let's schedule on M, T, Th, F.
        if (day !== 3) { // Skip Wed? Or just schedule all 5 days with shorter hours?
            shifts.push({ emp: refEmp.name, time: '09:30 - 13:30', type: 'reinforcement' });
        } else {
            // Include Wed if hours needed.
            shifts.push({ emp: refEmp.name, time: '09:30 - 13:30', type: 'reinforcement' });
        }
    }

    // Apply 15m buffer to standard/holiday_shift types only (not reinforcement?)
    // User: "buffer de 15m a las horas estándar". 
    // Let's modify the push to use adjustTime.
    // Or map at the end?
    // Mapping at the end is safer.
    return shifts.map(s => {
        if (s.type === 'standard' || s.type === 'holiday_shift') {
            return { ...s, time: adjustTime(s.time, 15, 15) };
        }
        return s;
    });
}

function getSanJuanShifts(store: Store, date: Date, employees: Employee[], isHoliday: boolean, day: number): Shift[] {
    // Angela(30), Isabel(20). Alternate weekends.

    const angela = findEmp(employees, 'ÁNGELA') || findEmp(employees, 'ANGELA');
    const isabel = findEmp(employees, 'ISABEL');

    const shifts: Shift[] = [];
    const openClose = (day === 0 || isHoliday) ? '09:30 - 14:45' : (day === 6 ? '09:00 - 14:45' : '09:00 - 15:15');

    // Weekend / Holiday
    if (day === 6 || day === 0 || isHoliday) {
        const isEven = isEvenWeek(date);
        const main = isEven ? isabel : angela;
        if (main) shifts.push({ emp: main.name, time: openClose, type: isHoliday ? 'holiday_shift' : 'standard' });
        return shifts;
    }

    // Weekday (M-F)
    // Week A (Isabel Wkd): Angela M-F (30h). Perfect? 5*6.25 ~ 31h.
    // Week B (Angela Wkd): Angela needs 3 days approx. Isabel needs ~3 days.

    const isEven = isEvenWeek(date);

    if (isEven) {
        // Isabel Wkd. Angela M-F.
        // Isabel needs 8h more? 
        // 1 day overlap?
        if (angela) shifts.push({ emp: angela.name, time: openClose, type: 'standard' });
        if (isabel && day === 3) {
            // Isabel reinforcement Wed?
            shifts.push({ emp: isabel.name, time: '09:30 - 13:30', type: 'reinforcement' });
        }
    } else {
        // Angela Wkd. Angela needs ~3 days. Isabel needs ~3 days. (20h / 6h).
        // Total 6 days needed in 5 slots.
        // Overlap 1 day.
        // Angela: Mon, Wed, Fri. Isabel: Tue, Thu?
        // Isabel would get 12h. Short.
        // Angela would get 18h + 12h = 30h. Perfect.
        // Isabel needs 8h more.

        if (day === 1 || day === 3 || day === 5) { // M, W, F
            if (angela) shifts.push({ emp: angela.name, time: openClose, type: 'standard' });
        } else {
            if (isabel) shifts.push({ emp: isabel.name, time: openClose, type: 'standard' });
        }
        // Overlap Isabel on Fri?
        if (isabel && day === 5) {
            shifts.push({ emp: isabel.name, time: '09:30 - 13:30', type: 'reinforcement' });
        }
    }

    // Apply 15m buffer to standard/holiday_shift types only (not reinforcement?)
    // User: "buffer de 15m a las horas estándar". 
    // Let's modify the push to use adjustTime.
    // Or map at the end?
    // Mapping at the end is safer.
    return shifts.map(s => {
        if (s.type === 'standard' || s.type === 'holiday_shift') {
            return { ...s, time: adjustTime(s.time, 15, 15) };
        }
        return s;
    });
}

function getGenericShifts(store: Store, date: Date, employees: Employee[], isHoliday: boolean, day: number): Shift[] {
    // Fallback logic
    return [];
}

export function findSubstitutes(storeId: number, dateStr: string, start: string, end: string): Employee[] {
    const date = parseISO(dateStr);
    const day = getDay(date);

    // 1. Get all context
    const allStores = getAllStores();
    const allEmployees = getAllEmployees();
    const holidays = getAllHolidays();

    // 2. Calculate who is working anywhere
    const busyEmployeeIds = new Set<number>();

    for (const store of allStores) {
        // Get employees for this store
        const storeEmployees = allEmployees.filter(e => e.store_id === store.id);
        const shifts = getStoreShifts(store, date, storeEmployees, holidays);

        for (const shift of shifts) {
            const emp = allEmployees.find(e => e.name === shift.emp);
            if (emp) {
                busyEmployeeIds.add(emp.id);
            }
        }
    }

    // 3. Filter candidates
    // Exclude current store employees? Maybe yes, maybe no. 
    // Usually valid substitutes come from OTHER stores or are free in THIS store.
    // Let's return anyone who is NOT busy.

    return allEmployees.filter(e => !busyEmployeeIds.has(e.id));
}
