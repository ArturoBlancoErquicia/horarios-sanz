import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { getStoreById, getEmployeesByStore, createSchedule } from '@/lib/data';
import type { Employee } from '@/lib/types';

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        const storeIdStr = formData.get('storeId') as string | null;

        if (!file || !storeIdStr) {
            return NextResponse.json(
                { error: 'Faltan parámetros: file y storeId son obligatorios' },
                { status: 400 }
            );
        }

        const storeId = Number(storeIdStr);
        const store = getStoreById(storeId);
        if (!store) {
            return NextResponse.json({ error: 'Tienda no encontrada' }, { status: 404 });
        }

        const employees = getEmployeesByStore(storeId);

        // Read the xlsx file
        const arrayBuffer = await file.arrayBuffer();
        const wb = XLSX.read(arrayBuffer, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        if (!ws) {
            return NextResponse.json({ error: 'El archivo no contiene hojas de cálculo' }, { status: 400 });
        }

        const data: (string | number | undefined)[][] = XLSX.utils.sheet_to_json(ws, {
            header: 1,
            defval: '',
        });

        // Find the header row (the one starting with "Fecha")
        let headerRowIndex = -1;
        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            if (row && String(row[0]).toLowerCase() === 'fecha') {
                headerRowIndex = i;
                break;
            }
        }

        if (headerRowIndex === -1) {
            return NextResponse.json(
                { error: 'No se encontró la fila de cabecera (debe empezar con "Fecha")' },
                { status: 400 }
            );
        }

        const headerRow = data[headerRowIndex];
        // Map column indices to employees (columns after "Fecha" and "Día")
        const colEmployeeMap: { colIndex: number; employee: Employee }[] = [];

        for (let c = 2; c < headerRow.length; c++) {
            const colName = String(headerRow[c]).trim();
            if (!colName) continue;

            const emp = employees.find(
                e => e.name.toUpperCase() === colName.toUpperCase()
            );
            if (emp) {
                colEmployeeMap.push({ colIndex: c, employee: emp });
            }
        }

        if (colEmployeeMap.length === 0) {
            return NextResponse.json(
                { error: 'No se encontraron empleados coincidentes en la cabecera' },
                { status: 400 }
            );
        }

        // Parse data rows (rows after header until TOTAL or empty date)
        let imported = 0;
        let skipped = 0;

        for (let r = headerRowIndex + 1; r < data.length; r++) {
            const row = data[r];
            if (!row) continue;

            const dateCell = String(row[0]).trim();
            if (!dateCell || dateCell.toUpperCase() === 'TOTAL') break;

            // Validate date format (YYYY-MM-DD)
            const dateMatch = dateCell.match(/^\d{4}-\d{2}-\d{2}$/);
            if (!dateMatch) {
                skipped++;
                continue;
            }

            for (const { colIndex, employee } of colEmployeeMap) {
                const cellValue = String(row[colIndex] ?? '').trim();
                if (!cellValue) continue;

                // A cell can contain multiple shifts separated by " / "
                const shiftParts = cellValue.split(' / ');

                for (const shiftStr of shiftParts) {
                    const timeParts = shiftStr.trim().split(' - ');
                    if (timeParts.length !== 2) {
                        skipped++;
                        continue;
                    }

                    const startTime = timeParts[0].trim();
                    const endTime = timeParts[1].trim();

                    // Validate time format HH:mm
                    if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime)) {
                        skipped++;
                        continue;
                    }

                    createSchedule({
                        employee_id: employee.id,
                        store_id: storeId,
                        date: dateCell,
                        start_time: startTime,
                        end_time: endTime,
                        type: 'work',
                    });
                    imported++;
                }
            }
        }

        return NextResponse.json({
            success: true,
            message: `Importación completada: ${imported} turnos importados, ${skipped} omitidos`,
            imported,
            skipped,
        });
    } catch (error) {
        console.error('Error importing schedule:', error);
        return NextResponse.json(
            { error: 'Error al procesar el archivo' },
            { status: 500 }
        );
    }
}
