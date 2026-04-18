
import { format, getDay, getISOWeek, parseISO } from 'date-fns';
import { Store, Employee, getAllStores, getAllEmployees, getSchedulesByDate } from './data';
import { Holiday, getAllHolidays } from './holidays';

export interface Shift {
    emp: string;
    time: string;
    type: 'standard' | 'opening' | 'closing' | 'holiday' | 'holiday_shift' | 'reinforcement';
}

export function isEvenWeek(date: Date): boolean {
    return getISOWeek(date) % 2 === 0;
}

// Adjust time range by subtracting startDelta from start and adding endDelta to end
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

    return `${addMinutes(start, -startDelta)} - ${addMinutes(end, endDelta)}`;
}

// Apply 15-minute operational buffer to standard and holiday shifts
function applyBuffer(shifts: Shift[]): Shift[] {
    return shifts.map(s => {
        if (s.type === 'standard' || s.type === 'holiday_shift') {
            return { ...s, time: adjustTime(s.time, 15, 15) };
        }
        return s;
    });
}

// Find employee by name: tries exact match first, then partial
function findEmp(employees: Employee[], namePart: string): Employee | undefined {
    const upper = namePart.toUpperCase();
    return employees.find(e => e.name.toUpperCase() === upper)
        || employees.find(e => e.name.toUpperCase().includes(upper));
}

// Get store opening hours for the given day type
function getOpenClose(store: Store, isHoliday: boolean, day: number): string {
    if (isHoliday || day === 0) return `${store.open_time_sunday} - ${store.close_time_sunday}`;
    if (day === 6) return `${store.open_time_saturday} - ${store.close_time_saturday}`;
    return `${store.open_time_weekday} - ${store.close_time_weekday}`;
}

// Main Logic Entry Point
export function getStoreShifts(store: Store, date: Date, employees: Employee[], holidays: Holiday[]): Shift[] {
    const dateStr = format(date, 'yyyy-MM-dd');

    const dbSchedules = getSchedulesByDate(dateStr);
    const absenteesIds = new Set(dbSchedules.filter(s => s.type === 'absence').map(s => s.employee_id));
    const activeEmployees = employees.filter(e => !absenteesIds.has(e.id));

    const isHoliday = holidays.some(h => h.date === dateStr);
    const dayOfWeek = getDay(date); // 0=Sun, 1=Mon, ..., 6=Sat

    // Dispatch to store-specific logic using normalized name
    const name = store.name.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    let shifts: Shift[] = [];

    if (name.includes('JULIAN')) shifts = getSanJulianShifts(store, date, activeEmployees, isHoliday, dayOfWeek);
    else if (name.includes('CASTRALVO')) shifts = getCastralvoShifts(store, date, activeEmployees, isHoliday, dayOfWeek);
    else if (name.includes('ARAGON')) shifts = getAvAragonShifts(store, date, activeEmployees, isHoliday, dayOfWeek);
    else if (name.includes('AMALIA')) shifts = getStaAmaliaShifts(store, date, activeEmployees, isHoliday, dayOfWeek);
    else if (name.includes('FUENFRESCA')) shifts = getFuenfrescaShifts(store, date, activeEmployees, isHoliday, dayOfWeek);
    else if (name.includes('JUAN')) shifts = getSanJuanShifts(store, date, activeEmployees, isHoliday, dayOfWeek);
    else shifts = getGenericShifts();

    // Add reinforcement/override schedules from DB (skip absences and seeded 'work' entries)
    const extraSchedules = dbSchedules.filter(s => s.store_id === store.id && s.type !== 'absence' && s.type !== 'work');

    if (extraSchedules.length > 0) {
        const allEmployees = getAllEmployees();
        for (const sch of extraSchedules) {
            const empName = allEmployees.find(e => e.id === sch.employee_id)?.name || 'Unknown';
            shifts.push({
                emp: empName,
                time: `${sch.start_time} - ${sch.end_time}`,
                type: sch.type as Shift['type'],
            });
        }
    }

    return shifts;
}

// --- Store-Specific Logic ---

// San Julian: Carmen(35h), Natalia(30h), Marianis(5h)
// Natalia works Wed at Av Aragon. Alternating weekends Carmen/Natalia.
function getSanJulianShifts(store: Store, date: Date, employees: Employee[], isHoliday: boolean, day: number): Shift[] {
    const carmen = findEmp(employees, 'CARMEN');
    const natalia = findEmp(employees, 'NATALIA');
    const marianis = findEmp(employees, 'MARIANIS');

    const shifts: Shift[] = [];
    const openClose = getOpenClose(store, isHoliday, day);

    const isClosed = !store.open_time_sunday && (day === 0 || isHoliday);
    if (isClosed) return [{ emp: 'CERRADO', time: 'CERRADO', type: 'holiday' }];

    // Sunday / Holiday: alternating main + Marianis reinforcement
    if (day === 0 || isHoliday) {
        const mainEmp = isEvenWeek(date) ? natalia : carmen;
        if (mainEmp) shifts.push({ emp: mainEmp.name, time: openClose, type: isHoliday ? 'holiday_shift' : 'standard' });
        if (marianis) shifts.push({ emp: marianis.name, time: '09:30 - 14:30', type: 'reinforcement' });
        return shifts;
    }

    // Saturday: alternating main (same parity as Sunday)
    if (day === 6) {
        const mainEmp = isEvenWeek(date) ? natalia : carmen;
        if (mainEmp) shifts.push({ emp: mainEmp.name, time: openClose, type: 'standard' });
        return shifts;
    }

    // Wednesday: Carmen solo (Natalia at Aragon) + Marianis reinforcement
    if (day === 3) {
        if (carmen) shifts.push({ emp: carmen.name, time: openClose, type: 'standard' });
        if (marianis) shifts.push({ emp: marianis.name, time: '09:30 - 13:30', type: 'reinforcement' });
        return shifts;
    }

    // Mon, Tue, Thu, Fri: Carmen + Natalia simultaneous
    if (carmen) shifts.push({ emp: carmen.name, time: openClose, type: 'standard' });
    if (natalia) shifts.push({ emp: natalia.name, time: openClose, type: 'standard' });

    return applyBuffer(shifts);
}

// Castralvo: Mar(40h), Esther M(40h), Vicky(30h), Jorge(7.5h)
// Weekday shifts A(6:30-13:30) and B(7:00-15:00). Alternating weekends.
function getCastralvoShifts(store: Store, date: Date, employees: Employee[], isHoliday: boolean, day: number): Shift[] {
    const mar = findEmp(employees, 'MAR');
    const esther = findEmp(employees, 'ESTHER M') || findEmp(employees, 'ESTHER');
    const vicky = findEmp(employees, 'VICKY');
    const jorge = findEmp(employees, 'JORGE');

    const shifts: Shift[] = [];
    const isEven = isEvenWeek(date);

    // Weekend: Odd=Mar+Jorge, Even=Esther+Vicky
    if (day === 6 || day === 0) {
        if (!isEven) {
            if (mar) {
                const time = (day === 6) ? '07:30 - 15:00' : '06:30 - 14:30';
                shifts.push({ emp: mar.name, time, type: isHoliday ? 'holiday_shift' : 'standard' });
            }
            if (jorge) {
                const time = (day === 6) ? '06:30 - 13:30' : '07:30 - 15:00';
                shifts.push({ emp: jorge.name, time, type: 'standard' });
            }
        } else {
            if (esther) {
                const time = (day === 6) ? '07:30 - 15:00' : '06:30 - 14:30';
                shifts.push({ emp: esther.name, time, type: isHoliday ? 'holiday_shift' : 'standard' });
            }
            if (vicky) {
                const time = (day === 6) ? '06:30 - 13:30' : '07:30 - 15:00';
                shifts.push({ emp: vicky.name, time, type: 'standard' });
            }
        }
        return applyBuffer(shifts);
    }

    // Weekday focus depends on who worked the weekend
    const weekdayFocus = !isEven ? 'ESTHER_VICKY' : 'MAR';

    // Weekday holiday
    if (isHoliday) {
        if (weekdayFocus === 'MAR') {
            if (mar) shifts.push({ emp: mar.name, time: '07:30 - 14:30', type: 'holiday_shift' });
        } else {
            if (esther) shifts.push({ emp: esther.name, time: '07:30 - 14:30', type: 'holiday_shift' });
            if (vicky) shifts.push({ emp: vicky.name, time: '07:30 - 14:30', type: 'reinforcement' });
        }
        return applyBuffer(shifts);
    }

    // Standard weekdays with rotation
    if (day === 1) { // Mon: Mar + Esther
        if (mar) shifts.push({ emp: mar.name, time: '06:30 - 13:30', type: 'standard' });
        if (esther) shifts.push({ emp: esther.name, time: '07:00 - 15:00', type: 'standard' });
    } else if (day === 2) { // Tue: Mar + Vicky
        if (mar) shifts.push({ emp: mar.name, time: '06:30 - 13:30', type: 'standard' });
        if (vicky) shifts.push({ emp: vicky.name, time: '07:00 - 15:00', type: 'standard' });
    } else if (day === 3) { // Wed: depends on focus
        if (weekdayFocus === 'MAR') {
            if (mar) shifts.push({ emp: mar.name, time: '06:30 - 13:30', type: 'standard' });
            if (esther) shifts.push({ emp: esther.name, time: '07:00 - 15:00', type: 'standard' });
        } else {
            if (esther) shifts.push({ emp: esther.name, time: '06:30 - 13:30', type: 'standard' });
            if (vicky) shifts.push({ emp: vicky.name, time: '07:00 - 15:00', type: 'standard' });
        }
    } else if (day === 4) { // Thu: Mar + Esther
        if (mar) shifts.push({ emp: mar.name, time: '06:30 - 13:30', type: 'standard' });
        if (esther) shifts.push({ emp: esther.name, time: '07:00 - 15:00', type: 'standard' });
    } else if (day === 5) { // Fri: all three
        if (mar) shifts.push({ emp: mar.name, time: '06:30 - 13:30', type: 'standard' });
        if (esther) shifts.push({ emp: esther.name, time: '07:00 - 15:00', type: 'standard' });
        if (vicky) shifts.push({ emp: vicky.name, time: '07:00 - 15:00', type: 'reinforcement' });
    }

    return applyBuffer(shifts);
}

// Av Aragon: Esther P(25h), Karla(20h). Natalia (from San Julian) on Wed.
function getAvAragonShifts(store: Store, date: Date, employees: Employee[], isHoliday: boolean, day: number): Shift[] {
    const esther = findEmp(employees, 'ESTHER P');
    const karla = findEmp(employees, 'KARLA');

    const shifts: Shift[] = [];
    const time = isHoliday || day === 0 ? '08:30 - 14:15' : (day === 6 ? '07:30 - 14:15' : '08:00 - 14:15');

    // Wednesday: Natalia (cross-store) + Esther reinforcement
    if (day === 3 && !isHoliday) {
        shifts.push({ emp: 'NATALIA (San Julian)', time, type: 'standard' });
        if (esther) shifts.push({ emp: esther.name, time: '09:00 - 13:00', type: 'reinforcement' });
        return shifts;
    }

    // Weekend / Holiday: alternating Esther/Karla
    if (day === 6 || day === 0 || isHoliday) {
        const main = isEvenWeek(date) ? karla : esther;
        if (main) shifts.push({ emp: main.name, time, type: isHoliday ? 'holiday_shift' : 'standard' });
        return shifts;
    }

    // Weekdays (M, T, Th, F): Esther main + Karla reinforcement
    if (esther) shifts.push({ emp: esther.name, time, type: 'standard' });
    if (karla) shifts.push({ emp: karla.name, time: '09:00 - 13:00', type: 'reinforcement' });

    return applyBuffer(shifts);
}

// Sta Amalia: Asun(40h), Bea(30h), Violeta(15h), Lara(5h)
// Asun full day. Bea reinforcement 7:30-12. Violeta/Lara alternate weekend reinforcement.
function getStaAmaliaShifts(store: Store, date: Date, employees: Employee[], isHoliday: boolean, day: number): Shift[] {
    const asun = findEmp(employees, 'ASUN');
    const bea = findEmp(employees, 'BEA');
    const violeta = findEmp(employees, 'VIOLETA');
    const lara = findEmp(employees, 'LARA');

    const shifts: Shift[] = [];
    const openClose = (day === 6 || day === 0 || isHoliday) ? '08:00 - 14:45' : '07:30 - 14:45';

    // Main shift (Asun works every day except non-holiday Sundays)
    if (day !== 0 || isHoliday) {
        if (asun) shifts.push({ emp: asun.name, time: openClose, type: isHoliday ? 'holiday_shift' : 'standard' });
    }

    // Weekend / Holiday reinforcement
    if (day === 6 || day === 0 || isHoliday) {
        const isEven = isEvenWeek(date);
        const refEmp = isEven ? lara : violeta;
        if (refEmp) shifts.push({ emp: refEmp.name, time: '09:15 - 14:15', type: 'reinforcement' });

        // Bea covers Sunday/Holiday main shift
        if ((day === 0 || isHoliday) && bea) {
            shifts.push({ emp: bea.name, time: openClose, type: isHoliday ? 'holiday_shift' : 'standard' });
        }
    }

    // Weekday reinforcement
    if (day >= 1 && day <= 5 && !isHoliday) {
        if (bea) shifts.push({ emp: bea.name, time: '07:30 - 12:00', type: 'reinforcement' });
        // Violeta reinforcement on M, W, F
        if ((day === 1 || day === 3 || day === 5) && violeta) {
            shifts.push({ emp: violeta.name, time: '10:00 - 13:30', type: 'reinforcement' });
        }
    }

    return applyBuffer(shifts);
}

// Fuenfresca: Yolanda(35h), Mari(30h). Sabrina(5h), Jorge Lopez(5h) weekend reinforcement.
function getFuenfrescaShifts(store: Store, date: Date, employees: Employee[], isHoliday: boolean, day: number): Shift[] {
    const yolanda = findEmp(employees, 'YOLANDA');
    const mari = findEmp(employees, 'MARI');
    const sabrina = findEmp(employees, 'SABRINA');
    const jorgel = findEmp(employees, 'LOPEZ') || findEmp(employees, 'LOPEZ');

    const shifts: Shift[] = [];
    const openClose = '07:30 - 14:30';
    const isEven = isEvenWeek(date);

    // Weekend / Holiday: alternating main + alternating reinforcement
    if (day === 6 || day === 0 || isHoliday) {
        const main = isEven ? mari : yolanda;
        if (main) shifts.push({ emp: main.name, time: openClose, type: isHoliday ? 'holiday_shift' : 'standard' });

        const ref = isEven ? jorgel : sabrina;
        if (ref) shifts.push({ emp: ref.name, time: '09:30 - 14:30', type: 'reinforcement' });

        return shifts;
    }

    // Weekday: who worked weekend gets lighter weekday load
    const mainEmp = isEven ? yolanda : mari;
    const refEmp = isEven ? mari : yolanda;

    if (mainEmp) shifts.push({ emp: mainEmp.name, time: openClose, type: 'standard' });
    if (refEmp) shifts.push({ emp: refEmp.name, time: '09:30 - 13:30', type: 'reinforcement' });

    return applyBuffer(shifts);
}

// San Juan: Angela(30h), Isabel(20h). Alternating weekends.
function getSanJuanShifts(store: Store, date: Date, employees: Employee[], isHoliday: boolean, day: number): Shift[] {
    const angela = findEmp(employees, 'ANGELA') || findEmp(employees, 'ANGELA');
    const isabel = findEmp(employees, 'ISABEL');

    const shifts: Shift[] = [];
    const openClose = (day === 0 || isHoliday) ? '09:30 - 14:45' : (day === 6 ? '09:00 - 14:45' : '09:00 - 15:15');

    // Weekend / Holiday
    if (day === 6 || day === 0 || isHoliday) {
        const main = isEvenWeek(date) ? isabel : angela;
        if (main) shifts.push({ emp: main.name, time: openClose, type: isHoliday ? 'holiday_shift' : 'standard' });
        return shifts;
    }

    const isEven = isEvenWeek(date);

    if (isEven) {
        // Isabel worked weekend. Angela M-F, Isabel reinforcement Wed.
        if (angela) shifts.push({ emp: angela.name, time: openClose, type: 'standard' });
        if (isabel && day === 3) {
            shifts.push({ emp: isabel.name, time: '09:30 - 13:30', type: 'reinforcement' });
        }
    } else {
        // Angela worked weekend. Split weekdays: Angela M/W/F, Isabel T/Th.
        if (day === 1 || day === 3 || day === 5) {
            if (angela) shifts.push({ emp: angela.name, time: openClose, type: 'standard' });
        } else {
            if (isabel) shifts.push({ emp: isabel.name, time: openClose, type: 'standard' });
        }
        // Isabel reinforcement on Fri overlap
        if (isabel && day === 5) {
            shifts.push({ emp: isabel.name, time: '09:30 - 13:30', type: 'reinforcement' });
        }
    }

    return applyBuffer(shifts);
}

function getGenericShifts(): Shift[] {
    return [];
}

export function findSubstitutes(storeId: number, dateStr: string, start: string, end: string): Employee[] {
    const date = parseISO(dateStr);

    const allStores = getAllStores();
    const allEmployees = getAllEmployees();
    const holidays = getAllHolidays();

    // Calculate who is working anywhere on this date
    const busyEmployeeIds = new Set<number>();

    for (const store of allStores) {
        const storeEmployees = allEmployees.filter(e => e.store_id === store.id);
        const shifts = getStoreShifts(store, date, storeEmployees, holidays);

        for (const shift of shifts) {
            const emp = allEmployees.find(e => e.name === shift.emp);
            if (emp) busyEmployeeIds.add(emp.id);
        }
    }

    return allEmployees.filter(e => !busyEmployeeIds.has(e.id));
}
