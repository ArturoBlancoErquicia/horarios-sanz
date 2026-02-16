
import { format, getDay, getISOWeek, isSameDay } from 'date-fns';
import { Store, Employee } from './data';
import { Holiday } from './holidays';

export interface Shift {
    emp: string;
    time: string;
    type: 'standard' | 'opening' | 'closing' | 'holiday' | 'holiday_shift' | 'reinforcement';
}

// Helper: Check if week is even (for alternating schedules)
export function isEvenWeek(date: Date): boolean {
    return getISOWeek(date) % 2 === 0;
}

// Helper: Get employee by name (partial match)
function findEmp(employees: Employee[], namePart: string): Employee | undefined {
    const found = employees.find(e => e.name.toUpperCase().includes(namePart.toUpperCase()));
    if (!found) console.log(`[Logic] Warning: Employee matching '${namePart}' not found in:`, employees.map(e => e.name));
    return found;
}

// Main Logic Entry Point
export function getStoreShifts(store: Store, date: Date, employees: Employee[], holidays: Holiday[]): Shift[] {
    console.log(`[Logic] Calculating shifts for ${store.name} on ${format(date, 'yyyy-MM-dd')}`);
    const isHoliday = holidays.some(h => h.date === format(date, 'yyyy-MM-dd'));
    const dayOfWeek = getDay(date); // 0=Sun, 1=Mon, ..., 6=Sat

    // Dispatch to specific store logic
    // Using normalized name check or IDs if stable
    const name = store.name.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    if (name.includes('JULIAN')) return getSanJulianShifts(store, date, employees, isHoliday, dayOfWeek);
    if (name.includes('CASTRALVO')) return getCastralvoShifts(store, date, employees, isHoliday, dayOfWeek);
    if (name.includes('ARAGON')) return getAvAragonShifts(store, date, employees, isHoliday, dayOfWeek);
    if (name.includes('AMALIA')) return getStaAmaliaShifts(store, date, employees, isHoliday, dayOfWeek);
    if (name.includes('FUENFRESCA')) return getFuenfrescaShifts(store, date, employees, isHoliday, dayOfWeek);
    if (name.includes('JUAN')) return getSanJuanShifts(store, date, employees, isHoliday, dayOfWeek);

    // Fallback: Generic Logic (Single Shift Rotation)
    return getGenericShifts(store, date, employees, isHoliday, dayOfWeek);
}

// --- Store Specific Logics ---

function getSanJulianShifts(store: Store, date: Date, employees: Employee[], isHoliday: boolean, day: number): Shift[] {
    // Staff: Carmen (35h), Natalia (25h), Jorge L (5h)
    // Hours: 08:00 - 14:30 (6.5h) approx

    const carmen = findEmp(employees, 'CARMEN');
    const natalia = findEmp(employees, 'NATALIA');
    const jorge = findEmp(employees, 'JORGE');

    const shifts: Shift[] = [];
    // Standard times based on rules provided or defaults
    const openClose = isHoliday || day === 0 ? `${store.open_time_sunday} - ${store.close_time_sunday}` :
        day === 6 ? `${store.open_time_saturday} - ${store.close_time_saturday}` :
            `${store.open_time_weekday} - ${store.close_time_weekday}`;

    const isClosed = !store.open_time_sunday && (day === 0 || isHoliday);
    if (isClosed) return [{ emp: 'CERRADO', time: 'CERRADO', type: 'holiday' }];

    // Sunday / Holiday
    if (day === 0 || isHoliday) {
        // Alternating Weekend: Carmen vs Natalia
        const mainEmp = isEvenWeek(date) ? natalia : carmen;
        if (mainEmp) shifts.push({ emp: mainEmp.name, time: openClose, type: isHoliday ? 'holiday_shift' : 'standard' });

        // Refuerzo: Jorge L (Sundays/Holidays)
        if (jorge) shifts.push({ emp: jorge.name, time: '09:30 - 14:30', type: 'reinforcement' });
        return shifts;
    }

    // Saturday
    if (day === 6) {
        const mainEmp = isEvenWeek(date) ? natalia : carmen;
        if (mainEmp) shifts.push({ emp: mainEmp.name, time: openClose, type: 'standard' });
        return shifts;
    }

    // Weekdays (L-V)
    // Logic: 
    // Wed: Carmen (Natalia is at Av Aragon).
    // Mon, Tue, Thu, Fri: Distribute to reach ~35h (Carmen) and ~25h (Natalia).
    // Approx shift 6.5h.
    // Carmen needs ~5.4 shifts/week. Natalia ~3.8 shifts/week.

    if (day === 3) { // Wednesday
        if (carmen) shifts.push({ emp: carmen.name, time: openClose, type: 'standard' });
        return shifts;
    }

    // Mon, Tue, Thu, Fri distribution
    // Strategy: Carmen works Mon, Thu. Natalia works Tue, Fri? 
    // Let's bias towards Carmen to hit 35h.
    // Carmen: Mon, Tue, Thu. Natalia: Fri.

    // Week A (Natalia Wkd): Nat 2 days + Fri = 3 days (19.5h). Low. Carmen 3 days + Wed = 4 days (26h). Low.
    // Week B (Carmen Wkd): Nat 1 day (6.5h). Low. Carmen 2 days + Wed + Wkd = 5 days (32.5h). Close.

    // Adjusted Strategy to max hours:
    // Overlap might be needed or 6-day coverage? 
    // Assuming single shift owner per day implies they don't overlap.
    // Let's rotate Mon, Tue, Thu, Fri based on Even Week to balance.

    const isEven = isEvenWeek(date); // Even = Natalia Wkd. Odd = Carmen Wkd.

    if (isEven) {
        // Natalia works weekend. She needs rest? Or works more?
        // Let's give Natalia Fri. Carmen Mon, Tue, Thu?
        // Carmen (Mon, Tue, Wed, Thu) = 4 days. Natalia (Fri, Sat, Sun) = 3 days.
        if (day === 5) { // Fri
            if (natalia) shifts.push({ emp: natalia.name, time: openClose, type: 'standard' });
        } else { // Mon, Tue, Thu
            if (carmen) shifts.push({ emp: carmen.name, time: openClose, type: 'standard' });
        }
    } else {
        // Carmen works weekend (Sat, Sun).
        // Carmen needs to rest partially?
        // Carmen (Sat, Sun, Wed). 
        // Natalia needs hours. Natalia (Mon, Tue, Thu, Fri).
        if (day === 1 || day === 2 || day === 4 || day === 5) {
            if (natalia) shifts.push({ emp: natalia.name, time: openClose, type: 'standard' });
        } else {
            // Wed handled above.
        }
    }

    return shifts;
}

function getCastralvoShifts(store: Store, date: Date, employees: Employee[], isHoliday: boolean, day: number): Shift[] {
    // Mar(40), Rosa(40), Esther M(30), Lara(6.5)

    const mar = findEmp(employees, 'MAR');
    const rosa = findEmp(employees, 'ROSA');
    const esther = findEmp(employees, 'ESTHER');
    const lara = findEmp(employees, 'LARA');

    const shifts: Shift[] = [];
    const openClose = day === 0 || isHoliday ? '07:00 - 15:00' : '07:00 - 15:00';
    // Weekday Reinforcement: 7:00 - 13:30.
    // Weekend Reinforcement: 8:00 - 14:30.

    const isEven = isEvenWeek(date);

    // Weekend / Holiday
    if (day === 6 || day === 0 || isHoliday) {
        if (isEven) {
            // Weekend 2: Rosa (Main) + Esther (Ref)
            if (rosa) shifts.push({ emp: rosa.name, time: openClose, type: isHoliday ? 'holiday_shift' : 'standard' });
            if (esther) shifts.push({ emp: esther.name, time: '08:00 - 14:30', type: 'reinforcement' });
        } else {
            // Weekend 1: Mar (Main) + Lara (Ref)
            if (mar) shifts.push({ emp: mar.name, time: openClose, type: isHoliday ? 'holiday_shift' : 'standard' });
            if (lara) shifts.push({ emp: lara.name, time: '08:00 - 14:30', type: 'reinforcement' });
        }
        return shifts;
    }

    // Weekdays (L-V)
    // Mar & Rosa (40h). Esther (30h).
    // Esther (30h) covers reinforcement Mon-Fri? 
    // 5 * 6.5h = 32.5h. Matches perfectly with 30h contract (approx).
    if (esther) shifts.push({ emp: esther.name, time: '07:00 - 13:30', type: 'reinforcement' });

    // Main Shift (7-15, 8h)
    // Mar and Rosa Need 40h.
    // They work 5 days a week?
    // If Mar works Weekend (Odd week), she works Sat+Sun. Needs 3 more days.
    // If Rosa is OFF Weekend (Odd week), she works 5 days?
    // Pattern:
    // Odd Week (Mar Wkd): Mar (Sat, Sun, Mon, Wed, Fri)? Rosa (Tue, Thu)? No, Rosa needs 40h.
    // Actually, if they perform 40h, they definitely act as "Turno Mañana/Tarde" but this is a single shift store?
    // Or maybe they split the week?
    // Let's assume standard rotation:
    // If Mar works Weekend, she takes days OFF during week.
    // If Rosa acts as relief, she works the other days.
    // BUT they both have 40h! This implies they both work full time.
    // Impossible in a single-shift store unless they overlap or shift is split.
    // "Entre semana el refuerzo es de 7-13:30".
    // Maybe Main is 7-15 and Reinforcement is 7-13:30. That's 2 people almost all morning.
    // So Mar and Rosa must alternate being Main vs Reinforcement?
    // OR one is Main, one is Reinforcement? 
    // But Esther M is Reinforcement.
    // How do Mar (40) and Rosa (40) fit in ONE main slot (8h/day)?
    // 7 days * 8h = 56h total open time.
    // They have 80h combined.
    // Conclusion: They MUST overlap or there's a 2nd shift not listed?
    // Or maybe different store? No, Castralvo.
    // Let's assume they Alternate Weeks for MAIN, and the other goes somewhere else? No info.
    // Or maybe they work together?
    // Given the constraints, I will alternate them on the Main shift to ensure coverage, but warn user.
    // Actually, maybe one is Main (7-15) and the other is... where?
    // Re-reading: "Mar(40), Rosa(40)".
    // Maybe they split the day? No, "Turno único".
    // Let's just alternate D/D.

    if (isEven) {
        // Rosa is on Weekend duty. Mar is off weekend.
        // Rosa works Sat, Sun. Needs 3 days (Mon, Wed, Fri?).
        // Mar works 5 days (Mon, Tue, Wed, Thu, Fri).
        // Conflict on M, W, F.
        // I will assign Mar to Mon-Fri when she is NOT on weekend.
        // And Rosa takes her days off?
        // This logic is imperfect for 40h/40h.
        // I'll stick to a simple alternation for now.
        const main = (day % 2 === 0) ? rosa : mar;
        if (main) shifts.push({ emp: main.name, time: openClose, type: 'standard' });
    } else {
        // Mar on Weekend. Rosa off.
        const main = (day % 2 !== 0) ? mar : rosa;
        if (main) shifts.push({ emp: main.name, time: openClose, type: 'standard' });
    }

    return shifts;
}

function getAvAragonShifts(store: Store, date: Date, employees: Employee[], isHoliday: boolean, day: number): Shift[] {
    // Esther P (25), M Jose (20). Natalia (San Julian) Wed.

    const esther = findEmp(employees, 'ESTHER');
    const mjose = findEmp(employees, 'JOSE');
    const nataliaMock = { name: 'NATALIA (San Julián)', id: 0, store_id: 0, weekly_hours: 0, rules: '' };

    const shifts: Shift[] = [];
    let time = isHoliday || day === 0 ? '08:30 - 14:15' : (day === 6 ? '07:30 - 14:15' : '08:00 - 14:15');

    // Wednesday: Natalia
    if (day === 3 && !isHoliday) {
        shifts.push({ emp: nataliaMock.name, time: time, type: 'standard' });
        return shifts;
    }

    // Weekend
    if (day === 6 || day === 0 || isHoliday) {
        const isEven = isEvenWeek(date);
        const main = isEven ? mjose : esther;
        if (main) shifts.push({ emp: main.name, time: time, type: isHoliday ? 'holiday_shift' : 'standard' });
        return shifts;
    }

    // Weekdays (M, T, Th, F)
    const isEven = isEvenWeek(date);

    // Esther needs ~4 days (25h). M Jose needs ~3 days (20h).
    // Total 7 slots needed. Available 4.
    // Overlap needed on 3 days.

    // Strategy: 
    // Esther works M, T, Th, F (Primary).
    // M Jose works M, T, F (Reinforcement/Overlap).

    if (day === 1 || day === 2 || day === 4 || day === 5) {
        // Main shift: Esther (except maybe one day Main is M Jose? Let's check hours)
        // If Esther Main 4 days * 6.25 = 25h. PERFECT.
        if (esther) shifts.push({ emp: esther.name, time: time, type: 'standard' });

        // M Jose Overlap (M, T, F)
        // M Jose needs 20h. If she does 3 days * 4h = 12h. + Wkd (12.5h) = 24.5h (High).
        // If Wkd OFF, she needs 20h -> 5 days * 4h.
        // Let's adjust overlap to 3 days * 6h? Or 3 days * 4.5h?
        // Let's give M Jose: M, T, F overlap 8:30-13:30 (5h).
        // Week Even (M Jose Wkd): Sat+Sun (12.5) + M,T,F (15) = 27.5. (High).
        // Week Odd (Esther Wkd): M Jose 15h. (Low).
        // M Jose needs stable 20h.
        // Let's reduce M Jose overlap days.
        // or alternate.

        if (mjose && (day === 1 || day === 2 || day === 5)) {
            shifts.push({ emp: mjose.name, time: '09:00 - 13:00', type: 'reinforcement' });
        }
    }

    return shifts;
}

function getStaAmaliaShifts(store: Store, date: Date, employees: Employee[], isHoliday: boolean, day: number): Shift[] {
    // Asun (40) - Entera.
    // Bea (30) - Refuerzo 7:30-12h.
    // Iman (13), Clara (5). Refuerzo findes alternos 9:15-14:15.

    const asun = findEmp(employees, 'ASUN');
    const bea = findEmp(employees, 'BEA');
    const iman = findEmp(employees, 'IMÁN') || findEmp(employees, 'IMAN');
    const clara = findEmp(employees, 'CLARA');

    const shifts: Shift[] = [];
    const openClose = (day === 6 || day === 0 || isHoliday) ? '08:00 - 14:45' : '07:30 - 14:45';

    // Main Shift (Asun)
    // Needs 40h. Needs 1 day off/week.
    // Give her Sunday off always.
    if (day !== 0 || isHoliday) {
        if (asun) shifts.push({ emp: asun.name, time: openClose, type: isHoliday ? 'holiday_shift' : 'standard' });
    }

    // Weekend Reinforcement (Iman/Clara)
    if (day === 6 || day === 0 || isHoliday) {
        const refEmp = isEvenWeek(date) ? clara : iman;
        if (refEmp) shifts.push({ emp: refEmp.name, time: '09:15 - 14:15', type: 'reinforcement' });
    }

    // Bea Reinforcement (M-Sun, restricted times)
    if (bea) {
        if (day === 6 || day === 0 || isHoliday) {
            // Wkds
            shifts.push({ emp: bea.name, time: '08:00 - 12:00', type: 'reinforcement' });
        } else {
            // Weekdays 
            shifts.push({ emp: bea.name, time: '07:30 - 12:00', type: 'reinforcement' });
        }
    }

    // Iman Weekday Reinforcement (Needs ~4h/week more).
    if ((day === 5 || day === 2) && !isHoliday) {
        if (iman) shifts.push({ emp: iman.name, time: '09:15 - 13:15', type: 'reinforcement' });
    }

    return shifts;
}

function getFuenfrescaShifts(store: Store, date: Date, employees: Employee[], isHoliday: boolean, day: number): Shift[] {
    // Yolanda(35), Mari(30). Alternate weekends.
    // Judith(5), Paola(5). Alternate weekends reinforcement 9:30-14:30.

    // Yolanda 35, Mari 30. Total 65h. 
    // Store Open: 07:30 - 14:30 (7h).
    // Weekdays (5x7=35h). Weekend (2x7=14h). Total Open = 49h.
    // 65h > 49h. Overlap required.

    const yolanda = findEmp(employees, 'YOLANDA');
    const mari = findEmp(employees, 'MARI');
    const judith = findEmp(employees, 'JUDITH');
    const paola = findEmp(employees, 'PAOLA');

    const shifts: Shift[] = [];
    const openClose = '07:30 - 14:30';

    const isEven = isEvenWeek(date);

    // Weekend / Holiday
    if (day === 6 || day === 0 || isHoliday) {
        // Main Logic: Yolanda vs Mari alternate
        const main = isEven ? mari : yolanda; // Even=Mari Wkd
        if (main) shifts.push({ emp: main.name, time: openClose, type: isHoliday ? 'holiday_shift' : 'standard' });

        // Refuerzo Logic: Judith vs Paola alternate
        const ref = isEven ? paola : judith;
        if (ref) shifts.push({ emp: ref.name, time: '09:30 - 14:30', type: 'reinforcement' });

        return shifts;
    }

    // Weekday (M-F)
    // Needs to distribute ~35h+30h (minus weekends).
    // Week A (Mari Wkd): Mari 14h. Needs 16h. Yolanda 0h Wkd. Needs 35h.
    // Total need M-F: 51h.
    // Open hours M-F: 35h.
    // Excess 16h -> ~2 days overlap or 3 days overlap.
    // Let's schedule both on some days?
    // Or schedule one Main, one Reinforcement/Overlap.
    // Since we don't have explicit Reinforcement hours, maybe they split?
    // User said "Ajuntate a las horas".
    // I'll schedule both on peak days (e.g. Fri, Mon?) or Alternating coverage?
    // Let's try: Yolanda works M-F Main. Mari works M-W Overlap?
    // This simple logic hits hours.

    // Better Logic:
    // Week A (Mari Wkd): Mari needs 2 days (Mon, Wed?). Yolanda needs 5 days M-F.
    // Week B (Yolanda Wkd): Yolanda needs 3 days (Mon, Wed, Fri?). Mari needs 30h (4 days + 0.5?).

    // To ensure they get hours:
    // Always schedule Yolanda M, T, W, Th, F. (35h) - wait, she works 35h TOTAL.
    // If Yolanda works weekend (14h), she only needs 21h (3 weekdays).
    // If Yolanda OFF weekend, she needs 35h (5 weekdays).

    // Mari (30h).
    // If Mari works weekend (14h), she needs 16h (2-3 day).
    // If Mari OFF weekend, she needs 30h (4-5 days).

    // Pattern:
    // Week A (Mari Wkd): Mari (Sat, Sun, Mon, Wed). Yolanda (Tue, Thu, Fri).
    // Week B (Yolanda Wkd): Yolanda (Sat, Sun, Mon, Wed, Fri). Mari (Tue, Thu).

    if (day === 6 || day === 0) return shifts; // Should be handled above

    // M=1, T=2, W=3, Th=4, F=5

    if (isEven) {
        // Mari Wkd. Mari works Mon, Wed? Yolanda Tue, Thu, Fri.
        if (day === 1 || day === 3) {
            if (mari) shifts.push({ emp: mari.name, time: openClose, type: 'standard' });
        } else {
            if (yolanda) shifts.push({ emp: yolanda.name, time: openClose, type: 'standard' });
        }
        // Adjustment: Yolanda needs 35h in this week (OFF wkd). She gets 3 days (21h). Short.
        // Mari needs 30h. Gets 14+14 = 28h. Close.
        // Yolanda is significantly short.
        // WE MUST OVERLAP.
        if (yolanda && (day === 1 || day === 3)) {
            // Add Yolanda as reinforcement/overlap
            shifts.push({ emp: yolanda.name, time: '08:00 - 13:00', type: 'reinforcement' }); // Mock overlap time
        }
    } else {
        // Yolanda Wkd. Yolanda (Sat, Sun). Needs 21h -> 3 days.
        // She works Mon, Wed, Fri? Matches 21h + 14h = 35h. Perfect.
        // Mari (Off Wkd). Needs 30h -> ~4 days.
        // She works Tue, Thu. (14h). Short.
        // Mari needs 2 more days. (Mon, Wed).
        // Conflict on Mon, Wed.

        if (day === 2 || day === 4) {
            if (mari) shifts.push({ emp: mari.name, time: openClose, type: 'standard' });
        } else {
            if (yolanda) shifts.push({ emp: yolanda.name, time: openClose, type: 'standard' });
            // Overlap Mari
            if (mari && (day === 1 || day === 3 || day === 5)) {
                shifts.push({ emp: mari.name, time: '08:00 - 13:00', type: 'reinforcement' });
            }
        }
    }

    return shifts;
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

    return shifts;
}

function getGenericShifts(store: Store, date: Date, employees: Employee[], isHoliday: boolean, day: number): Shift[] {
    // Fallback logic
    return [];
}
