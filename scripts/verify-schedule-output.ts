
import { getAllStores, getEmployeesByStore } from '@/lib/data';
import { getAllHolidays } from '@/lib/holidays';
import { getStoreShifts, Shift } from '@/lib/logic';
import { format, addDays, startOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';

async function main() {
    console.log('# Verification of Schedules and Stores\n');
    console.log(`Generated on: ${new Date().toLocaleString()}\n`);

    const stores = getAllStores();
    const holidays = getAllHolidays();

    // Define range: Next 14 days starting from tomorrow
    const startDate = new Date();
    const daysToCheck = 14;

    for (const store of stores) {
        console.log(`## Store: ${store.name} (ID: ${store.id})`);
        console.log(`| Date | Day | Shift Type | Time | Employee |`);
        console.log(`|---|---|---|---|---|`);

        const employees = getEmployeesByStore(store.id);

        for (let i = 0; i < daysToCheck; i++) {
            const currentDate = addDays(startDate, i);
            const dateStr = format(currentDate, 'yyyy-MM-dd');
            const dayName = format(currentDate, 'EEEE', { locale: es });

            let shifts: Shift[] = [];
            try {
                shifts = getStoreShifts(store, currentDate, employees, holidays);
            } catch (e) {
                console.error(`Error calculating shifts for ${store.name} on ${dateStr}:`, e);
                continue;
            }

            if (shifts.length === 0) {
                console.log(`| ${dateStr} | ${dayName} | - | - | - |`);
            } else {
                for (const shift of shifts) {
                    console.log(`| ${dateStr} | ${dayName} | ${shift.type} | ${shift.time} | ${shift.emp} |`);
                }
            }
        }
        console.log('\n');
    }
}

main().catch(console.error);
