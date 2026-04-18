import Link from 'next/link';
import { getStoreById, getEmployeesByStore } from '@/lib/data';
import { Card } from '@/components/Card';
import ScheduleGrid from '@/components/ScheduleGrid';
import ScheduleExportImport from '@/components/ScheduleExportImport';
import { notFound } from 'next/navigation';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, startOfWeek, endOfWeek, addMonths, subMonths, addWeeks, subWeeks } from 'date-fns';
import { es } from 'date-fns/locale';

export default async function SchedulePage({ params, searchParams }: { params: Promise<{ id: string }>, searchParams: Promise<{ view?: string, date?: string }> }) {
    const { id: idParam } = await params;
    const { view = 'month', date } = await searchParams;

    const id = parseInt(idParam);
    const store = getStoreById(id);

    if (!store) {
        notFound();
    }

    const employees = getEmployeesByStore(id);
    const baseDate = date ? new Date(date.includes('T') ? date : `${date}T12:00:00`) : new Date();

    let rangeStart, rangeEnd, dateFormat;

    if (view === 'week') {
        rangeStart = startOfWeek(baseDate, { weekStartsOn: 1 });
        rangeEnd = endOfWeek(baseDate, { weekStartsOn: 1 });
        dateFormat = "'Semana del' d 'de' MMMM";
    } else {
        const monthStart = startOfMonth(baseDate);
        const monthEnd = endOfMonth(baseDate);
        rangeStart = startOfWeek(monthStart, { weekStartsOn: 1 });
        rangeEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
        dateFormat = 'MMMM yyyy';
    }

    const days = eachDayOfInterval({ start: rangeStart, end: rangeEnd });

    const { getStoreShifts } = await import('@/lib/logic');
    const { getAllHolidays } = await import('@/lib/holidays');
    const holidays = getAllHolidays();

    const daysData = days.map(day => {
        const shifts = getStoreShifts(store, day, employees, holidays);
        return {
            date: day,
            dateStr: format(day, 'yyyy-MM-dd'),
            shifts,
        };
    });

    const hoursSummary = employees.map(emp => {
        let totalAssigned = 0;
        daysData.forEach(({ date: day, shifts }) => {
            // Only count days within the current month (skip padding days)
            if (!isSameMonth(day, baseDate)) return;
            shifts.forEach(shift => {
                if (shift.emp === emp.name && shift.time !== 'CERRADO') {
                    const [start, end] = shift.time.split(' - ');
                    if (start && end) {
                        const [sh, sm] = start.split(':').map(Number);
                        const [eh, em] = end.split(':').map(Number);
                        totalAssigned += (eh + em / 60) - (sh + sm / 60);
                    }
                }
            });
        });

        // Use actual days in month (not grid days which include padding)
        const daysInMonth = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0).getDate();
        const monthlyTarget = (emp.weekly_hours / 7) * daysInMonth;
        const difference = totalAssigned - monthlyTarget;

        return { emp, totalAssigned, monthlyTarget, difference };
    });

    return (
        <main className="min-h-screen p-8 max-w-7xl mx-auto font-[family-name:var(--font-geist-sans)]">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <Link href={`/store/${id}`}>
                        <button className="p-2 border border-blue-200 rounded text-blue-600 hover:bg-blue-50 transition">
                            <ArrowLeft size={20} />
                        </button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-black uppercase text-gray-800 flex items-center gap-2">
                            Cuadrante {view === 'week' ? 'Semanal' : 'Mensual'}
                        </h1>
                        <p className="text-gray-500 text-sm">{store.name}</p>
                    </div>
                </div>

                <div className="flex items-center gap-4 p-1 bg-white rounded-lg border border-gray-200 shadow-sm">
                    <div className="flex bg-gray-100 rounded p-1">
                        <Link href={`?view=month&date=${baseDate.toISOString()}`}>
                            <button className={`px-3 py-1 text-sm font-bold rounded ${view === 'month' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>Mes</button>
                        </Link>
                        <Link href={`?view=week&date=${baseDate.toISOString()}`}>
                            <button className={`px-3 py-1 text-sm font-bold rounded ${view === 'week' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>Semana</button>
                        </Link>
                    </div>

                    <div className="h-6 w-px bg-gray-300 mx-2"></div>

                    <div className="flex items-center gap-2">
                        <Link href={`?view=${view}&date=${(view === 'week' ? subWeeks(baseDate, 1) : subMonths(baseDate, 1)).toISOString()}`}>
                            <button className="p-1 hover:bg-gray-100 rounded text-blue-600"><ChevronLeft size={20} /></button>
                        </Link>
                        <span className="text-sm font-bold w-40 text-center capitalize">{format(baseDate, dateFormat, { locale: es })}</span>
                        <Link href={`?view=${view}&date=${(view === 'week' ? addWeeks(baseDate, 1) : addMonths(baseDate, 1)).toISOString()}`}>
                            <button className="p-1 hover:bg-gray-100 rounded text-blue-600"><ChevronRight size={20} /></button>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Export/Import */}
            <div className="mb-4">
                <ScheduleExportImport
                    storeId={id}
                    month={baseDate.getMonth() + 1}
                    year={baseDate.getFullYear()}
                />
            </div>

            {/* Calendar Grid */}
            <Card className="overflow-hidden p-0 border-0 shadow-lg">
                <ScheduleGrid
                    days={daysData}
                    baseDate={baseDate}
                    view={view}
                    storeId={id}
                    employees={employees}
                />
            </Card>

            {/* Legend */}
            <div className="mt-4 flex flex-wrap gap-4 text-xs font-bold text-gray-500">
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-blue-50 border border-blue-400 rounded"></div> Jornada
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-green-50 border border-green-400 rounded"></div> Refuerzo
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-pink-50 border border-pink-400 rounded"></div> Festivo
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-red-50 border border-red-400 rounded"></div> Cerrado
                </div>
            </div>

            {/* Hours Summary */}
            <Card title="Resumen de Horas (Mensual)" className="mt-8 border-t-4 border-t-green-600">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                            <tr>
                                <th className="px-6 py-3">Empleado</th>
                                <th className="px-6 py-3 text-center">Horas Contrato</th>
                                <th className="px-6 py-3 text-center">Horas Asignadas</th>
                                <th className="px-6 py-3 text-center">Diferencia</th>
                                <th className="px-6 py-3 text-center">Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {hoursSummary.map(({ emp, totalAssigned, monthlyTarget, difference }) => (
                                <tr key={emp.id} className="bg-white border-b hover:bg-gray-50">
                                    <td className="px-6 py-4 font-bold text-gray-900">{emp.name}</td>
                                    <td className="px-6 py-4 text-center font-mono">{monthlyTarget.toFixed(1)}h</td>
                                    <td className="px-6 py-4 text-center font-mono font-bold text-blue-600">{totalAssigned.toFixed(1)}h</td>
                                    <td className={`px-6 py-4 text-center font-bold ${difference >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                        {difference > 0 ? '+' : ''}{difference.toFixed(1)}h
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {difference >= 0 ?
                                            <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded">Cumplido</span> :
                                            <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded">Déficit</span>
                                        }
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </main>
    );
}
