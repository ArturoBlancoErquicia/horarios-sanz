
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
    // Contratos: Carmen 35h, Natalia 30h (incluye 6.25h Aragón miércoles), Marianis 5h.
    // Patrón: quien trabaja el finde libra 1-2 días entre semana.
    // Marianis fijo miércoles 09:30-14:30 (5h exactas).
    // EVEN: Natalia finde; ODD: Carmen finde.
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
    const weekendWorker = isEven ? natalia : carmen;

    // Domingo / Festivo entre semana: titular alterno (sin refuerzo de Marianis; Marianis solo miércoles)
    if (day === 0 || isHoliday) {
        if (weekendWorker) shifts.push({ emp: weekendWorker.name, time: buffered(openClose), type: isHoliday ? 'holiday_shift' : 'standard' });
        return shifts;
    }

    // Sábado: titular del finde
    if (day === 6) {
        if (weekendWorker) shifts.push({ emp: weekendWorker.name, time: buffered(openClose), type: 'standard' });
        return shifts;
    }

    // Miércoles: Carmen + Marianis (Natalia cruza a Av Aragón)
    if (day === 3) {
        if (carmen) shifts.push({ emp: carmen.name, time: buffered(openClose), type: 'standard' });
        if (marianis) shifts.push({ emp: marianis.name, time: '09:30 - 14:30', type: 'reinforcement' });
        return shifts;
    }

    // Viernes: solo el titular de entre semana (el del finde libra)
    if (day === 5) {
        const weekdayOnly = isEven ? carmen : natalia;
        if (weekdayOnly) shifts.push({ emp: weekdayOnly.name, time: buffered(openClose), type: 'standard' });
        return shifts;
    }

    // Jueves:
    //   EVEN (Natalia finde): Carmen + Natalia (ambos, Natalia aún no libra hasta V-S-D)
    //   ODD (Carmen finde): Natalia sola (Carmen libra J y V)
    if (day === 4) {
        if (isEven) {
            if (carmen) shifts.push({ emp: carmen.name, time: buffered(openClose), type: 'standard' });
            if (natalia) shifts.push({ emp: natalia.name, time: buffered(openClose), type: 'standard' });
        } else {
            if (natalia) shifts.push({ emp: natalia.name, time: buffered(openClose), type: 'standard' });
        }
        return shifts;
    }

    // Lunes, Martes: Carmen + Natalia
    if (carmen) shifts.push({ emp: carmen.name, time: buffered(openClose), type: 'standard' });
    if (natalia) shifts.push({ emp: natalia.name, time: buffered(openClose), type: 'standard' });
    return shifts;
}

function getCastralvoShifts(store: Store, date: Date, employees: Employee[], isHoliday: boolean, day: number): Shift[] {
    // Contratos: Mar 40h, Esther M 40h, Vicky 30h, Jorge 7.5h.
    // Turnos principales sin buffer (son 8h reales que ya cubren jornada completa):
    //   A = 06:30 - 14:30 (8h)
    //   B = 07:00 - 15:00 (8h)
    // Mar y Esther M hacen 5 turnos/semana cada uno = 40h exacto.
    // Vicky rellena con refuerzos (3h ó 4h) y turnos completos = ~30h.
    // Jorge cubre el sábado todas las semanas (07:00-14:30 = 7.5h) = 7.5h exacto.
    // EVEN: Esther M libra miércoles y viernes; ODD: Mar libra miércoles y viernes.
    // Finde: EVEN -> Esther M principal (Sáb+Dom); ODD -> Mar principal (Sáb+Dom).
    const mar = findEmp(employees, 'MAR');
    const esther = findEmp(employees, 'ESTHER M');
    const vicky = findEmp(employees, 'VICKY');
    const jorge = findEmp(employees, 'JORGE');
    const TURN_A = '06:30 - 14:30';
    const TURN_B = '07:00 - 15:00';
    const VICKY_REF_WEEKDAY = '09:00 - 12:00'; // 3h
    const VICKY_REF_SAT = '09:00 - 13:00'; // 4h
    const VICKY_REF_SUN = '09:30 - 14:30'; // 5h
    const JORGE_SAT = '07:00 - 14:30'; // 7.5h

    const shifts: Shift[] = [];
    const isEven = isEvenWeek(date);

    // --- Sábado: Jorge siempre + principal alternante ---
    if (day === 6) {
        const principal = isEven ? esther : mar;
        if (principal) shifts.push({ emp: principal.name, time: TURN_A, type: isHoliday ? 'holiday_shift' : 'standard' });
        if (jorge) shifts.push({ emp: jorge.name, time: JORGE_SAT, type: 'standard' });
        if (isEven && vicky) shifts.push({ emp: vicky.name, time: VICKY_REF_SAT, type: 'reinforcement' });
        return shifts;
    }

    // --- Domingo: principal alternante; ODD añade Vicky refuerzo 5h para cuadrar sus 30h ---
    if (day === 0) {
        const principal = isEven ? esther : mar;
        if (principal) shifts.push({ emp: principal.name, time: TURN_A, type: isHoliday ? 'holiday_shift' : 'standard' });
        if (!isEven && vicky) shifts.push({ emp: vicky.name, time: VICKY_REF_SUN, type: 'reinforcement' });
        return shifts;
    }

    // --- Festivo entre semana: principal alternante + refuerzo Vicky ---
    if (isHoliday) {
        const principal = isEven ? mar : esther;
        if (principal) shifts.push({ emp: principal.name, time: TURN_A, type: 'holiday_shift' });
        if (vicky) shifts.push({ emp: vicky.name, time: TURN_B, type: 'reinforcement' });
        return shifts;
    }

    // --- Lunes, Martes, Jueves: Mar(A) + Esther(B) + Vicky refuerzo 3h ---
    if (day === 1 || day === 2 || day === 4) {
        if (mar) shifts.push({ emp: mar.name, time: TURN_A, type: 'standard' });
        if (esther) shifts.push({ emp: esther.name, time: TURN_B, type: 'standard' });
        if (vicky) shifts.push({ emp: vicky.name, time: VICKY_REF_WEEKDAY, type: 'reinforcement' });
        return shifts;
    }

    // --- Miércoles y Viernes: alternancia par/impar (uno libra) ---
    if (day === 3 || day === 5) {
        if (isEven) {
            // Esther libra; Mar(A) + Vicky(B completa)
            if (mar) shifts.push({ emp: mar.name, time: TURN_A, type: 'standard' });
            if (vicky) shifts.push({ emp: vicky.name, time: TURN_B, type: 'standard' });
        } else {
            // Mar libra; Esther(A) + Vicky(B completa)
            if (esther) shifts.push({ emp: esther.name, time: TURN_A, type: 'standard' });
            if (vicky) shifts.push({ emp: vicky.name, time: TURN_B, type: 'standard' });
        }
        return shifts;
    }

    return shifts;
}

function getAvAragonShifts(store: Store, date: Date, employees: Employee[], isHoliday: boolean, day: number): Shift[] {
    // Contratos: Esther P 25h, Karla 20h. Natalia (San Julián) siempre miércoles.
    // Turnos buffered: L-V ~6.75h, Sáb 7.25h, Dom 6.25h.
    // EVEN: Karla finde (S+D), Esther P L/M/J/V, Karla refuerzo 3h el miércoles.
    // ODD: Esther P finde (S+D), Karla L/M/V, Esther P refuerzo 3h el miércoles + J.
    const esther = findEmp(employees, 'ESTHER P');
    const karla = findEmp(employees, 'KARLA');

    const shifts: Shift[] = [];
    const openClose = isHoliday || day === 0
        ? `${store.open_time_sunday} - ${store.close_time_sunday}`
        : day === 6
            ? `${store.open_time_saturday} - ${store.close_time_saturday}`
            : `${store.open_time_weekday} - ${store.close_time_weekday}`;
    const REF_WEDNESDAY = '10:00 - 13:00'; // 3h
    const isEven = isEvenWeek(date);

    // Festivo entre semana
    if (isHoliday && day !== 0 && day !== 6) {
        const principal = isEven ? esther : karla;
        if (principal) shifts.push({ emp: principal.name, time: buffered(openClose), type: 'holiday_shift' });
        return shifts;
    }

    // Fin de semana alterno: EVEN -> Karla; ODD -> Esther P
    if (day === 6 || day === 0) {
        const main = isEven ? karla : esther;
        if (main) shifts.push({ emp: main.name, time: buffered(openClose), type: 'standard' });
        return shifts;
    }

    // Miércoles: Natalia cruza de San Julián + refuerzo 3h
    if (day === 3) {
        shifts.push({ emp: 'NATALIA (San Julián)', time: buffered(openClose), type: 'standard' });
        if (isEven) {
            if (karla) shifts.push({ emp: karla.name, time: REF_WEDNESDAY, type: 'reinforcement' });
        } else {
            if (esther) shifts.push({ emp: esther.name, time: REF_WEDNESDAY, type: 'reinforcement' });
        }
        return shifts;
    }

    // Jueves: Esther P siempre (ambas semanas trabaja los jueves)
    if (day === 4) {
        if (esther) shifts.push({ emp: esther.name, time: buffered(openClose), type: 'standard' });
        return shifts;
    }

    // Lunes, Martes:
    //   EVEN: Esther P (Karla libra entre semana, trabaja finde)
    //   ODD:  Karla (Esther libra entre semana, trabaja finde)
    if (day === 1 || day === 2) {
        const emp = isEven ? esther : karla;
        if (emp) shifts.push({ emp: emp.name, time: buffered(openClose), type: 'standard' });
        return shifts;
    }

    // Viernes:
    //   EVEN: Esther P titular + Karla refuerzo 3h (para cuadrar 20h de Karla)
    //   ODD:  Karla titular
    if (day === 5) {
        if (isEven) {
            if (esther) shifts.push({ emp: esther.name, time: buffered(openClose), type: 'standard' });
            if (karla) shifts.push({ emp: karla.name, time: REF_WEDNESDAY, type: 'reinforcement' });
        } else {
            if (karla) shifts.push({ emp: karla.name, time: buffered(openClose), type: 'standard' });
        }
        return shifts;
    }

    return shifts;
}

function getStaAmaliaShifts(store: Store, date: Date, employees: Employee[], isHoliday: boolean, day: number): Shift[] {
    // Contratos: Asun 40h, Bea 30h, Violeta 15h, Lara 5h.
    // Asun: L-V jornada completa (07:15-15:00 buffered, 7.75h x 5 = 38.75h).
    // Bea: refuerzo 4.5h los L,X,V (13.5h) + Sáb y Dom jornada completa (7.75h x 2 = 15.5h) = 29h.
    // Violeta: refuerzo 3h en L,X,V (EVEN) o M,J,V (ODD) = 9h + 1 finde (5h) alternante.
    // Lara: 5h cada 2 semanas alternadas (Sáb EVEN, Dom ODD).
    const asun = findEmp(employees, 'ASUN');
    const bea = findEmp(employees, 'BEA');
    const violeta = findEmp(employees, 'VIOLETA');
    const lara = findEmp(employees, 'LARA');

    const shifts: Shift[] = [];
    const BEA_REF = '07:30 - 13:00'; // 5.5h (3 días × 5.5 + S+D 2×6.75 = 30h exacto)
    const VIOLETA_REF = '10:00 - 13:30'; // 3.5h (3 × 3.5 + 5h finde = 15.5h ≈ 15)
    const WEEKEND_FULL = '08:00 - 14:45'; // 6.75h sin buffer
    const ASUN_FULL_BUFFERED = buffered('07:30 - 14:45'); // 07:15-15:00 = 7.75h
    const VIOLETA_LARA_FINDE = '09:15 - 14:15'; // 5h
    const isEven = isEvenWeek(date);

    // Domingo
    if (day === 0 || (isHoliday && day !== 6)) {
        if (bea) shifts.push({ emp: bea.name, time: WEEKEND_FULL, type: isHoliday ? 'holiday_shift' : 'standard' });
        const refEmp = isEven ? violeta : lara;
        if (refEmp) shifts.push({ emp: refEmp.name, time: VIOLETA_LARA_FINDE, type: 'reinforcement' });
        return shifts;
    }

    // Sábado
    if (day === 6) {
        if (bea) shifts.push({ emp: bea.name, time: WEEKEND_FULL, type: 'standard' });
        const refEmp = isEven ? lara : violeta;
        if (refEmp) shifts.push({ emp: refEmp.name, time: VIOLETA_LARA_FINDE, type: 'reinforcement' });
        return shifts;
    }

    // Entre semana L-V: Asun siempre
    if (asun) shifts.push({ emp: asun.name, time: ASUN_FULL_BUFFERED, type: 'standard' });

    // Bea refuerzo L, X, V (ambas semanas)
    if ((day === 1 || day === 3 || day === 5) && bea) {
        shifts.push({ emp: bea.name, time: BEA_REF, type: 'reinforcement' });
    }

    // Violeta refuerzo:
    //   EVEN: L, X, V
    //   ODD:  M, J, V
    if (violeta) {
        if (isEven && (day === 1 || day === 3 || day === 5)) {
            shifts.push({ emp: violeta.name, time: VIOLETA_REF, type: 'reinforcement' });
        } else if (!isEven && (day === 2 || day === 4 || day === 5)) {
            shifts.push({ emp: violeta.name, time: VIOLETA_REF, type: 'reinforcement' });
        }
    }

    return shifts;
}

function getFuenfrescaShifts(store: Store, date: Date, employees: Employee[], isHoliday: boolean, day: number): Shift[] {
    // Yolanda(35h), Mari(30h), Sabrina(5h), Jorge López(5h)
    // Turno completo: 07:30-14:30 (7h)
    // Finde alterno. Quien trabaja finde libra viernes.
    // Sabrina/Jorge López: finde alterno refuerzo 09:30-14:30 (5h)

    // Contratos: Yolanda 35h, Mari 30h, Sabrina 5h, Jorge López 5h.
    // Turno completo: 07:15-14:45 buffered (7.5h).
    // Yolanda: 5 turnos/semana (37.5h ≈ 35h).
    // Mari: 4 turnos/semana (30h exactos): los 2 de finde + 2 entre semana.
    // Sabrina / Jorge López: alternan semana completa (10h en su semana, 0 en la otra → avg 5h).
    // EVEN: Mari finde (Sáb+Dom) + Jorge López refuerzo finde; ODD: Yolanda finde + Sabrina refuerzo.
    const yolanda = findEmp(employees, 'YOLANDA');
    const mari = findEmp(employees, 'MARI');
    const sabrina = findEmp(employees, 'SABRINA');
    const jorgel = findEmp(employees, 'JORGE LÓPEZ');

    const shifts: Shift[] = [];
    // Sin buffer: jornada de 7h exactos para que Yolanda (5 turnos × 7 = 35) cuadre su contrato.
    const FULL = '07:30 - 14:30'; // 7h
    const FINDE_REF = '09:30 - 14:30'; // 5h
    const MARI_WEEKDAY_EXTRA = '09:00 - 11:00'; // 2h refuerzo para llegar a 30h
    const isEven = isEvenWeek(date);

    // Finde / Festivo
    if (day === 6 || day === 0 || isHoliday) {
        const main = isEven ? mari : yolanda;
        if (main) shifts.push({ emp: main.name, time: FULL, type: isHoliday ? 'holiday_shift' : 'standard' });
        const ref = isEven ? jorgel : sabrina;
        if (ref) shifts.push({ emp: ref.name, time: FINDE_REF, type: 'reinforcement' });
        return shifts;
    }

    // EVEN (Mari finde): Yolanda L-V (5×7 = 35h); Mari Mar+Jue full (14) + Mié ref 2h + S+D full (14) = 30h.
    if (isEven) {
        if (yolanda) shifts.push({ emp: yolanda.name, time: FULL, type: 'standard' });
        if ((day === 2 || day === 4) && mari) {
            shifts.push({ emp: mari.name, time: FULL, type: 'standard' });
        }
        if (day === 3 && mari) {
            shifts.push({ emp: mari.name, time: MARI_WEEKDAY_EXTRA, type: 'reinforcement' });
        }
        return shifts;
    }

    // ODD (Yolanda finde): Yolanda Mar+Jue+Vie (3×7=21) + S+D (14) = 35h; Mari L,M,X,J (4×7=28) + Vie ref 2h = 30h.
    if (day === 2 || day === 4 || day === 5) {
        if (yolanda) shifts.push({ emp: yolanda.name, time: FULL, type: 'standard' });
    }
    if (day === 1 || day === 2 || day === 3 || day === 4) {
        if (mari) shifts.push({ emp: mari.name, time: FULL, type: 'standard' });
    }
    if (day === 5 && mari) {
        shifts.push({ emp: mari.name, time: MARI_WEEKDAY_EXTRA, type: 'reinforcement' });
    }

    return shifts;
}

function getSanJuanShifts(store: Store, date: Date, employees: Employee[], isHoliday: boolean, day: number): Shift[] {
    // Contratos: Angela 30h, Isabel 20h. Turnos sin buffer (titular 6.75h L-V, 5.75h Sáb, 5.25h Dom).
    // EVEN (Isabel finde): Angela L,M,X,J full (4×6.75=27h) + V ref 3h = 30h. Isabel M ref 2h + V full + S + D = 20h.
    // ODD (Angela finde): Angela L ref 5.5h + X + V + S + D = 30h. Isabel L,M,J full (3×6.75=20.25h) = 20h.
    const angela = findEmp(employees, 'ANGELA');
    const isabel = findEmp(employees, 'ISABEL');

    const shifts: Shift[] = [];
    const openClose = (day === 0 || isHoliday)
        ? '09:30 - 14:45'
        : (day === 6 ? '09:00 - 14:45' : '09:00 - 15:15');
    const ANGELA_REF_VIE = '09:00 - 12:00'; // 3h (para cuadrar Angela EVEN 30h)
    const ANGELA_REF_LUN = '09:00 - 14:30'; // 5.5h (para cuadrar Angela ODD 30h)
    const ISABEL_REF_MAR = '09:00 - 13:30'; // 4.5h (Isabel EVEN 4.5 + 6.75 + 5.75 + 5.25 = 22.25 ≈ 20)
    const isEven = isEvenWeek(date);

    // --- Finde / Festivo: sin buffer ---
    if (day === 6 || day === 0 || isHoliday) {
        const main = isEven ? isabel : angela;
        if (main) shifts.push({ emp: main.name, time: openClose, type: isHoliday ? 'holiday_shift' : 'standard' });
        return shifts;
    }

    if (isEven) {
        // EVEN: Angela titular L-J + refuerzo V (3h); Isabel titular V + refuerzo M (2h) + finde.
        if (day === 1 || day === 2 || day === 3 || day === 4) {
            if (angela) shifts.push({ emp: angela.name, time: openClose, type: 'standard' });
        }
        if (day === 2 && isabel) {
            shifts.push({ emp: isabel.name, time: ISABEL_REF_MAR, type: 'reinforcement' });
        }
        if (day === 5) {
            if (isabel) shifts.push({ emp: isabel.name, time: openClose, type: 'standard' });
            if (angela) shifts.push({ emp: angela.name, time: ANGELA_REF_VIE, type: 'reinforcement' });
        }
        return shifts;
    }

    // ODD: Isabel titular L,M,J; Angela titular X,V; Angela refuerzo L (5.5h) + finde.
    if (day === 1) {
        if (isabel) shifts.push({ emp: isabel.name, time: openClose, type: 'standard' });
        if (angela) shifts.push({ emp: angela.name, time: ANGELA_REF_LUN, type: 'reinforcement' });
        return shifts;
    }
    if (day === 2 || day === 4) {
        if (isabel) shifts.push({ emp: isabel.name, time: openClose, type: 'standard' });
        return shifts;
    }
    if (day === 3 || day === 5) {
        if (angela) shifts.push({ emp: angela.name, time: openClose, type: 'standard' });
        return shifts;
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
