import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { format, getDaysInMonth, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { getStoreById, getEmployeesByStore } from '@/lib/data';
import { getAllHolidays } from '@/lib/holidays';
import { getStoreShifts, shiftDurationHours } from '@/lib/logic';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const storeId = Number(searchParams.get('storeId'));
    const month = Number(searchParams.get('month'));
    const year = Number(searchParams.get('year'));

    if (!storeId || !month || !year) {
        return NextResponse.json(
            { error: 'Faltan parámetros: storeId, month, year' },
            { status: 400 }
        );
    }

    const store = getStoreById(storeId);
    if (!store) {
        return NextResponse.json({ error: 'Tienda no encontrada' }, { status: 404 });
    }

    const employees = getEmployeesByStore(storeId);
    const holidays = getAllHolidays();
    const daysInMonth = getDaysInMonth(new Date(year, month - 1));

    // Build header row: Fecha | Día | Employee1 | Employee2 | ...
    const employeeNames = employees.map(e => e.name);
    const headerRow = ['Fecha', 'Día', ...employeeNames];

    // Build data rows
    const dataRows: (string | number)[][] = [];
    const totalHours: Record<string, number> = {};
    for (const name of employeeNames) {
        totalHours[name] = 0;
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month - 1, day);
        const dateStr = format(date, 'yyyy-MM-dd');
        const dayName = format(date, 'EEEE', { locale: es });

        const shifts = getStoreShifts(store, date, employees, holidays);

        const row: (string | number)[] = [dateStr, dayName];

        for (const empName of employeeNames) {
            const empShifts = shifts.filter(s => s.emp === empName);
            if (empShifts.length > 0) {
                const timeStr = empShifts.map(s => s.time).join(' / ');
                row.push(timeStr);

                // Accumulate hours
                for (const s of empShifts) {
                    const parts = s.time.split(' - ');
                    if (parts.length === 2) {
                        totalHours[empName] += shiftDurationHours(parts[0].trim(), parts[1].trim());
                    }
                }
            } else {
                row.push('');
            }
        }

        dataRows.push(row);
    }

    // Summary row
    const summaryRow: (string | number)[] = ['TOTAL', ''];
    for (const empName of employeeNames) {
        summaryRow.push(Math.round(totalHours[empName] * 10) / 10);
    }

    // Build worksheet
    const monthName = format(new Date(year, month - 1), 'MMMM yyyy', { locale: es });
    const titleRow = [`${store.name} - ${monthName}`];

    const wsData = [titleRow, [], headerRow, ...dataRows, [], summaryRow];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Set column widths
    ws['!cols'] = [
        { wch: 12 }, // Fecha
        { wch: 12 }, // Día
        ...employeeNames.map(() => ({ wch: 18 })),
    ];

    // Merge title row across all columns
    ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: employeeNames.length + 1 } },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Cuadrante');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const fileName = `cuadrante_${store.name.replace(/\s+/g, '_')}_${year}_${String(month).padStart(2, '0')}.xlsx`;

    return new NextResponse(buffer, {
        status: 200,
        headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="${fileName}"`,
        },
    });
}
