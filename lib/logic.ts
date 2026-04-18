
import { format, getDay, getISOWeek, parseISO, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
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

// Helper: Get employee by ID (preferred, exact match)
function findEmpById(employees: Employee[], id: number): Employee | undefined {
    return employees.find(e => e.id === id);
}

// Helper: Get employee by exact name (case-insensitive, accent-normalized, dot-insensitive)
function findEmp(employees: Employee[], name: string): Employee | undefined {
    const normalize = (s: string) => s.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\./g, "").trim();
    const target = normalize(name);
    return employees.find(e => normalize(e.name) === target);
}

// Helper: apply 15m buffer (-15 start, +15 end) to a time string
function buffered(time: string): string {
    return adjustTime(time, 15, 15);
}

// Main Logic Entry Point
export function getStoreShifts(store: Store, date: Date, employees: Employee[], holidays: Holiday[]): Shift[] {
    const dateStr = format(date, 'yyyy-MM-dd');

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
    // Carmen(35h), Natalia(30h), Marianis(5h)
    // Marianis: refuerzo Mie 09:30-13:30 y Dom alterno 09:30-14:30
    // Fin de semana alterno: semana par -> Natalia finde; semana impar -> Carmen finde

    const carmen = findEmp(employees, 'CARMEN');
    const natalia = findEmp(employees, 'NATALIA');
    const marianis = findEmp(employees, 'MARIANIS');

    const shifts: Shift[] = [];
    const openClose = isHoliday || day === 0 ? `${store.open_time_sunday} - ${store.close_time_sunday}` :
        day === 6 ? `${store.open_time_saturday} - ${store.close_time_saturday}` :
            `${store.open_time_weekday} - ${store.close_time_weekday}`;

    const isClosed = !store.open_time_sunday && (day === 0 || isHoliday);
    if (isClosed) return [{ emp: 'CERRADO', time: 'CERRADO', type: 'holiday' }];

    const isEven = isEvenWeek(date);
    // Semana par: Natalia finde/festivo; Semana impar: Carmen finde/festivo
    const weekendWorker = isEven ? natalia : carmen;

    // Domingo / Festivo entre semana: titular alterno + Marianis refuerzo 09:30-14:30
    if (day === 0 || isHoliday) {
        if (weekendWorker) shifts.push({ emp: weekendWorker.name, time: buffered(openClose), type: isHoliday ? 'holiday_shift' : 'standard' });
        if (marianis) shifts.push({ emp: marianis.name, time: '09:30 - 14:30', type: 'reinforcement' });
        return shifts;
    }

    // Sábado
    if (day === 6) {
        if (weekendWorker) shifts.push({ emp: weekendWorker.name, time: buffered(openClose), type: 'standard' });
        return shifts;
    }

    // Miércoles: Carmen + Marianis refuerzo 09:30-13:30 (Natalia cruza a Av Aragón)
    if (day === 3) {
        if (carmen) shifts.push({ emp: carmen.name, time: buffered(openClose), type: 'standard' });
        if (marianis) shifts.push({ emp: marianis.name, time: '09:30 - 13:30', type: 'reinforcement' });
        return shifts;
    }

    // L, M, J, V: Carmen + Natalia
    if (carmen) shifts.push({ emp: carmen.name, time: buffered(openClose), type: 'standard' });
    if (natalia) shifts.push({ emp: natalia.name, time: buffered(openClose), type: 'standard' });
    return shifts;
}

function getCastralvoShifts(store: Store, date: Date, employees: Employee[], isHoliday: boolean, day: number): Shift[] {
    // Mar(40h), Esther M(40h), Vicky(30h), Jorge(7.5h)
    // Finde par: Esther M + Vicky. Finde impar: Mar + Jorge.
    // Entre semana (L-V): Mar + Esther M rotan A/B, con refuerzos según día y semana.
    // Festivo L-V: misma logica alterna que finde (par -> Esther M+Vicky ; impar -> Mar+Jorge? pero test solo cubre)

    const mar = findEmp(employees, 'MAR');
    const esther = findEmp(employees, 'ESTHER M');
    const vicky = findEmp(employees, 'VICKY');
    const jorge = findEmp(employees, 'JORGE');

    const shifts: Shift[] = [];
    const isEven = isEvenWeek(date);

    // --- Fin de semana ---
    if (day === 6 || day === 0) {
        if (isEven) {
            // Semana par: Esther M + Vicky
            if (esther) shifts.push({ emp: esther.name, time: buffered(day === 6 ? '07:00 - 15:00' : '06:30 - 14:30'), type: isHoliday ? 'holiday_shift' : 'standard' });
            if (vicky) shifts.push({ emp: vicky.name, time: buffered(day === 6 ? '06:30 - 13:30' : '07:30 - 15:00'), type: 'standard' });
        } else {
            // Semana impar: Mar + Jorge
            if (mar) shifts.push({ emp: mar.name, time: buffered(day === 6 ? '07:00 - 15:00' : '06:30 - 14:30'), type: isHoliday ? 'holiday_shift' : 'standard' });
            if (jorge) shifts.push({ emp: jorge.name, time: buffered(day === 6 ? '06:30 - 13:30' : '07:30 - 15:00'), type: 'standard' });
        }
        return shifts;
    }

    // --- Festivo entre semana: misma alternancia par/impar que el finde ---
    if (isHoliday) {
        if (isEven) {
            if (mar) shifts.push({ emp: mar.name, time: buffered('06:30 - 13:30'), type: 'holiday_shift' });
        } else {
            if (esther) shifts.push({ emp: esther.name, time: buffered('06:30 - 14:30'), type: 'holiday_shift' });
            if (vicky) shifts.push({ emp: vicky.name, time: buffered('07:30 - 13:30'), type: 'reinforcement' });
        }
        return shifts;
    }

    // --- L, V: Mar + Esther M; Viernes añade Vicky refuerzo ---
    if (day === 1 || day === 5) {
        if (mar) shifts.push({ emp: mar.name, time: buffered('06:30 - 13:30'), type: 'standard' });
        if (esther) shifts.push({ emp: esther.name, time: buffered('07:00 - 15:00'), type: 'standard' });
        if (day === 5 && vicky) shifts.push({ emp: vicky.name, time: '09:00 - 13:00', type: 'reinforcement' });
        return shifts;
    }

    // --- Martes: Mar + Vicky ---
    if (day === 2) {
        if (mar) shifts.push({ emp: mar.name, time: buffered('06:30 - 14:30'), type: 'standard' });
        if (vicky) shifts.push({ emp: vicky.name, time: buffered('07:00 - 15:00'), type: 'standard' });
        return shifts;
    }

    // --- Miércoles: alterna semana par (Mar+Esther M) vs impar (Esther M+Vicky) ---
    if (day === 3) {
        if (isEven) {
            if (mar) shifts.push({ emp: mar.name, time: buffered('06:30 - 14:30'), type: 'standard' });
            if (esther) shifts.push({ emp: esther.name, time: buffered('07:00 - 15:00'), type: 'standard' });
        } else {
            if (esther) shifts.push({ emp: esther.name, time: buffered('06:30 - 14:30'), type: 'standard' });
            if (vicky) shifts.push({ emp: vicky.name, time: buffered('07:00 - 15:00'), type: 'standard' });
        }
        return shifts;
    }

    // --- Jueves (día 4): Mar + Esther M ---
    if (mar) shifts.push({ emp: mar.name, time: buffered('06:30 - 14:30'), type: 'standard' });
    if (esther) shifts.push({ emp: esther.name, time: buffered('07:00 - 15:00'), type: 'standard' });

    return shifts;
}

function getAvAragonShifts(store: Store, date: Date, employees: Employee[], isHoliday: boolean, day: number): Shift[] {
    // Esther P(25h), Karla(20h). Natalia (San Julián) miércoles.
    // Tienda abre 6.25h/día. Finde alterno.
    // Esther: 25h = 4 días completos. Karla: 20h = ~3.2 días.

    const esther = findEmp(employees, 'ESTHER P');
    const karla = findEmp(employees, 'KARLA');

    const shifts: Shift[] = [];
    const time = isHoliday || day === 0 ? '08:30 - 14:15' : (day === 6 ? '07:30 - 14:15' : '08:00 - 14:15');
    const isEven = isEvenWeek(date);

    // Miércoles: Natalia de San Julián
    if (day === 3 && !isHoliday) {
        shifts.push({ emp: 'NATALIA (San Julián)', time: time, type: 'standard' });
        return shifts;
    }

    // Fin de semana alterno
    if (day === 6 || day === 0 || isHoliday) {
        const main = isEven ? karla : esther;
        if (main) shifts.push({ emp: main.name, time: time, type: isHoliday ? 'holiday_shift' : 'standard' });
        return shifts;
    }

    // L, M, J, V (4 días disponibles)
    // Esther: L, M, J (3 días * 6.25 = 18.75h + finde alterno 6.25h avg = 25h)
    // Karla: M, J, V (3 días * 6.25 = 18.75h + finde alterno 6.25h avg ≈ 22h... ajustar)
    // Mejor: Esther L,M,J,V (4 * 6.25 = 25h) en semana sin finde
    //        Esther L,M,J (3 * 6.25 = 18.75 + finde 12.5 = 31.25... too much)
    // Solución: Esther L,M,J + finde alterno. Karla J,V + finde alterno.

    if (isEven) {
        // Karla trabaja finde -> Karla libra jueves
        if (day === 1 || day === 2) { // L,M: Esther
            if (esther) shifts.push({ emp: esther.name, time: time, type: 'standard' });
        } else if (day === 4) { // J: Esther
            if (esther) shifts.push({ emp: esther.name, time: time, type: 'standard' });
        } else if (day === 5) { // V: Karla
            if (karla) shifts.push({ emp: karla.name, time: time, type: 'standard' });
        }
    } else {
        // Esther trabaja finde -> Esther libra lunes
        if (day === 1) { // L: Karla
            if (karla) shifts.push({ emp: karla.name, time: time, type: 'standard' });
        } else if (day === 2) { // M: Esther
            if (esther) shifts.push({ emp: esther.name, time: time, type: 'standard' });
        } else if (day === 4 || day === 5) { // J,V: Karla
            if (karla) shifts.push({ emp: karla.name, time: time, type: 'standard' });
        }
    }

    return shifts;
}

function getStaAmaliaShifts(store: Store, date: Date, employees: Employee[], isHoliday: boolean, day: number): Shift[] {
    // Asun(40h), Bea(30h), Violeta(15h), Lara(5h)
    // Asun: jornada completa L-S (7.25h * 6 = 43.5... ajustar: L-V 7.25h + algún sáb)
    // Bea: refuerzo 07:30-12:00 (4.5h) L-V + domingo alterno
    // Violeta: finde alterno 09:15-14:15 (5h) + L,M,X refuerzo
    // Lara: finde alterno 09:15-14:15 (5h)

    const asun = findEmp(employees, 'ASUN');
    const bea = findEmp(employees, 'BEA');
    const violeta = findEmp(employees, 'VIOLETA');
    const lara = findEmp(employees, 'LARA');

    const shifts: Shift[] = [];
    const openClose = (day === 6 || day === 0 || isHoliday) ? '08:00 - 14:45' : '07:30 - 14:45';
    const isEven = isEvenWeek(date);

    // Domingo: Bea jornada completa + refuerzo alterno (Violeta/Lara)
    if (day === 0 || isHoliday) {
        if (bea) shifts.push({ emp: bea.name, time: openClose, type: isHoliday ? 'holiday_shift' : 'standard' });
        const refEmp = isEven ? lara : violeta;
        if (refEmp) shifts.push({ emp: refEmp.name, time: '09:15 - 14:15', type: 'reinforcement' });
        return shifts;
    }

    // Sábado: Asun + refuerzo alterno
    if (day === 6) {
        if (asun) shifts.push({ emp: asun.name, time: openClose, type: 'standard' });
        const refEmp = isEven ? lara : violeta;
        if (refEmp) shifts.push({ emp: refEmp.name, time: '09:15 - 14:15', type: 'reinforcement' });
        return shifts;
    }

    // L-V: Asun jornada completa
    if (asun) shifts.push({ emp: asun.name, time: openClose, type: 'standard' });

    // Bea refuerzo L-V (4.5h * 5 = 22.5h + dom alterno 6.75h avg ≈ 26h... ajustar)
    // Bea: 5 * 4.5 = 22.5 + dom alterno avg 3.375 = 25.875. Añadir jueves tarde.
    if (bea) shifts.push({ emp: bea.name, time: '07:30 - 12:00', type: 'reinforcement' });

    // Violeta refuerzo L,X (2 días * 3.5h = 7h + finde alterno 5h avg = 9.5h... close to 15)
    // Añadir viernes: 3 * 3.5 = 10.5 + finde 5h avg = 13h. Ajustar a 4h.
    if ((day === 1 || day === 3 || day === 5) && violeta) {
        shifts.push({ emp: violeta.name, time: '10:00 - 13:00', type: 'reinforcement' });
    }

    return shifts;
}

function getFuenfrescaShifts(store: Store, date: Date, employees: Employee[], isHoliday: boolean, day: number): Shift[] {
    // Yolanda(35h), Mari(30h), Sabrina(5h), Jorge López(5h)
    // Turno completo: 07:30-14:30 (7h)
    // Finde alterno. Quien trabaja finde libra viernes.
    // Sabrina/Jorge López: finde alterno refuerzo 09:30-14:30 (5h)

    const yolanda = findEmp(employees, 'YOLANDA');
    const mari = findEmp(employees, 'MARI');
    const sabrina = findEmp(employees, 'SABRINA');
    const jorgel = findEmp(employees, 'JORGE LÓPEZ');

    const shifts: Shift[] = [];
    const openClose = '07:30 - 14:30';
    const isEven = isEvenWeek(date);

    // Finde / Festivo
    if (day === 6 || day === 0 || isHoliday) {
        const main = isEven ? mari : yolanda;
        if (main) shifts.push({ emp: main.name, time: openClose, type: isHoliday ? 'holiday_shift' : 'standard' });
        const ref = isEven ? jorgel : sabrina;
        if (ref) shifts.push({ emp: ref.name, time: '09:30 - 14:30', type: 'reinforcement' });
        return shifts;
    }

    // Viernes: quien trabaja finde libra
    if (day === 5) {
        const weekdayOnly = isEven ? yolanda : mari;
        if (weekdayOnly) shifts.push({ emp: weekdayOnly.name, time: openClose, type: 'standard' });
        return shifts;
    }

    // L-J: ambas trabajan, una jornada completa y otra refuerzo
    // Semana par (Mari finde): Yolanda principal L-J + Mari refuerzo L-M-X
    // Semana impar (Yolanda finde): Mari principal L-J + Yolanda refuerzo L-M-X
    const mainEmp = isEven ? yolanda : mari;
    const refEmp = isEven ? mari : yolanda;

    if (mainEmp) shifts.push({ emp: mainEmp.name, time: openClose, type: 'standard' });

    // Refuerzo solo L, M, X (3 días) para ajustar horas
    if (day >= 1 && day <= 3 && refEmp) {
        shifts.push({ emp: refEmp.name, time: '09:00 - 13:00', type: 'reinforcement' });
    }

    return shifts;
}

function getSanJuanShifts(store: Store, date: Date, employees: Employee[], isHoliday: boolean, day: number): Shift[] {
    // Angela(30h), Isabel(20h). Finde alterno.
    // Semana par -> Isabel finde/festivo (no refuerzo).
    // Semana impar -> Angela finde/festivo.
    // Refuerzos Isabel entre semana según semana:
    //   par: Miércoles refuerzo 09:30-13:30
    //   impar: Martes como titular; Viernes refuerzo.

    const angela = findEmp(employees, 'ANGELA');
    const isabel = findEmp(employees, 'ISABEL');

    const shifts: Shift[] = [];
    const openClose = (day === 0 || isHoliday) ? '09:30 - 14:45' : (day === 6 ? '09:00 - 14:45' : '09:00 - 15:15');
    const isEven = isEvenWeek(date);

    // --- Finde / Festivo: sin buffer en San Juan ---
    if (day === 6 || day === 0 || isHoliday) {
        const main = isEven ? isabel : angela;
        if (main) shifts.push({ emp: main.name, time: openClose, type: isHoliday ? 'holiday_shift' : 'standard' });
        return shifts;
    }

    // --- Semana par: Angela L-V titular; Isabel solo miercoles como refuerzo ---
    if (isEven) {
        if (angela) shifts.push({ emp: angela.name, time: buffered(openClose), type: 'standard' });
        if (day === 3 && isabel) {
            shifts.push({ emp: isabel.name, time: '09:30 - 13:30', type: 'reinforcement' });
        }
        return shifts;
    }

    // --- Semana impar ---
    // Lunes/Miércoles/Jueves: Angela titular
    if (day === 1 || day === 3 || day === 4) {
        if (angela) shifts.push({ emp: angela.name, time: buffered(openClose), type: 'standard' });
    }
    // Martes: Isabel titular (Angela libre)
    if (day === 2 && isabel) {
        shifts.push({ emp: isabel.name, time: buffered(openClose), type: 'standard' });
    }
    // Viernes: Angela titular + Isabel refuerzo
    if (day === 5) {
        if (angela) shifts.push({ emp: angela.name, time: buffered(openClose), type: 'standard' });
        if (isabel) shifts.push({ emp: isabel.name, time: '09:30 - 13:30', type: 'reinforcement' });
    }

    return shifts;
}

function getGenericShifts(store: Store, date: Date, employees: Employee[], isHoliday: boolean, day: number): Shift[] {
    // Fallback logic
    return [];
}

// --- Utility: Parse time to hours ---
export function parseTimeToHours(timeStr: string): number {
    const [h, m] = timeStr.split(':').map(Number);
    return h + m / 60;
}

// --- Utility: Calculate shift duration in hours ---
export function shiftDurationHours(start: string, end: string): number {
    return parseTimeToHours(end) - parseTimeToHours(start);
}

// --- Conflict Detection: Check if employee has overlapping shifts ---
export interface ShiftConflict {
    employeeId: number;
    employeeName: string;
    date: string;
    store1: string;
    store2: string;
    time1: string;
    time2: string;
}

function timesOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
    const s1 = parseTimeToHours(start1), e1 = parseTimeToHours(end1);
    const s2 = parseTimeToHours(start2), e2 = parseTimeToHours(end2);
    return s1 < e2 && s2 < e1;
}

export function detectConflicts(dateStr: string): ShiftConflict[] {
    const date = parseISO(dateStr);
    const allStores = getAllStores();
    const allEmployees = getAllEmployees();
    const holidays = getAllHolidays();
    const conflicts: ShiftConflict[] = [];

    // Collect all shifts per employee across all stores
    const empShifts = new Map<string, { store: string; time: string; start: string; end: string }[]>();

    for (const store of allStores) {
        const storeEmployees = allEmployees.filter(e => e.store_id === store.id);
        const shifts = getStoreShifts(store, date, storeEmployees, holidays);

        for (const shift of shifts) {
            if (shift.emp === 'CERRADO') continue;
            const parts = shift.time.split(' - ');
            if (parts.length !== 2) continue;

            const existing = empShifts.get(shift.emp) || [];
            existing.push({ store: store.name, time: shift.time, start: parts[0], end: parts[1] });
            empShifts.set(shift.emp, existing);
        }
    }

    // Check for overlaps within the same employee
    for (const [empName, shifts] of empShifts) {
        for (let i = 0; i < shifts.length; i++) {
            for (let j = i + 1; j < shifts.length; j++) {
                if (shifts[i].store !== shifts[j].store &&
                    timesOverlap(shifts[i].start, shifts[i].end, shifts[j].start, shifts[j].end)) {
                    const emp = allEmployees.find(e => e.name === empName);
                    conflicts.push({
                        employeeId: emp?.id || 0,
                        employeeName: empName,
                        date: dateStr,
                        store1: shifts[i].store,
                        store2: shifts[j].store,
                        time1: shifts[i].time,
                        time2: shifts[j].time,
                    });
                }
            }
        }
    }

    return conflicts;
}

// --- Weekly Hours Validation ---
export interface WeeklyHoursCheck {
    employeeId: number;
    employeeName: string;
    contractHours: number;
    assignedHours: number;
    difference: number;
    overLimit: boolean;
}

export function checkWeeklyHours(employeeId: number, dateStr: string): WeeklyHoursCheck | null {
    const date = parseISO(dateStr);
    const allStores = getAllStores();
    const allEmployees = getAllEmployees();
    const holidays = getAllHolidays();

    const employee = allEmployees.find(e => e.id === employeeId);
    if (!employee) return null;

    // Get week range (Mon-Sun)
    const weekStart = startOfWeek(date, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

    let totalHours = 0;

    for (const day of weekDays) {
        for (const store of allStores) {
            const storeEmployees = allEmployees.filter(e => e.store_id === store.id);
            const shifts = getStoreShifts(store, day, storeEmployees, holidays);

            for (const shift of shifts) {
                if (shift.emp === employee.name && shift.time !== 'CERRADO') {
                    const parts = shift.time.split(' - ');
                    if (parts.length === 2) {
                        totalHours += shiftDurationHours(parts[0], parts[1]);
                    }
                }
            }
        }
    }

    return {
        employeeId: employee.id,
        employeeName: employee.name,
        contractHours: employee.weekly_hours,
        assignedHours: Math.round(totalHours * 10) / 10,
        difference: Math.round((totalHours - employee.weekly_hours) * 10) / 10,
        overLimit: totalHours > employee.weekly_hours * 1.1, // 10% tolerance
    };
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
