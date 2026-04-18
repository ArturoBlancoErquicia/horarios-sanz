import Link from 'next/link';
import { getStoreById, getEmployeesByStore } from '@/lib/data';
import { Card } from '@/components/Card';
import { notFound } from 'next/navigation';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, startOfWeek, endOfWeek, addMonths, subMonths, addWeeks, subWeeks, getDaysInMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { getStoreShifts, Shift } from '@/lib/logic';
import { getAllHolidays } from '@/lib/holidays';

export default async function SchedulePage({ params, searchParams }: { params: Promise<{ id: string }>, searchParams: Promise<{ view?: string, date?: string }> }) {
    const { id: idParam } = await params;
    const { view = 'month', date } = await searchParams;

    const id = parseInt(idParam);
    const store = getStoreById(id);

    if (!store) {
        notFound();
    }

    const employees = getEmployeesByStore(id);

    // Append T12:00:00 to avoid timezone shifts when parsing YYYY-MM-DD
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
    const weekDays = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];

    const holidays = getAllHolidays();
    const holidayDates = new Set(holidays.map(h => h.date));

    // Pre-compute shifts for all days to avoid duplicate calculations
    const shiftsByDay = new Map<string, Shift[]>();
    for (const day of days) {
        const key = format(day, 'yyyy-MM-dd');
        shiftsByDay.set(key, getStoreShifts(store, day, employees, holidays));
    }

    const getShiftsForDay = (day: Date): Shift[] => {
        return shiftsByDay.get(format(day, 'yyyy-MM-dd')) || [];
    };

    // Shift type to color/label mapping
    function shiftStyle(type: Shift['type']) {
        switch (type) {
            case 'holiday':
                return { bg: 'bg-red-50 border-red-400', label: 'Festivo' };
            case 'holiday_shift':
                return { bg: 'bg-pink-50 border-pink-400', label: 'Festivo' };
            case 'reinforcement':
                return { bg: 'bg-green-50 border-green-400', label: 'Refuerzo' };
            case 'standard':
            default:
                return { bg: 'bg-blue-50 border-blue-400', label: 'Jornada' };
        }
    }

    // Actual days in the calendar month for hours calculation
    const actualDaysInMonth = getDaysInMonth(baseDate);

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

            <Card className="overflow-hidden p-0 border-0 shadow-lg">
                <div className="grid grid-cols-7 border-b border-gray-200 bg-blue-600 text-white">
                    {weekDays.map((day) => (
                        <div key={day} className="p-3 text-center font-bold text-xs uppercase tracking-widest border-r border-blue-500 last:border-r-0">
                            {day}
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-7 bg-gray-200 gap-px border-b border-gray-200">
                    {days.map((day) => {
                        const shifts = getShiftsForDay(day);
                        const isCurrentMonth = isSameMonth(day, baseDate);
                        const isOutOfMonth = !isCurrentMonth && view === 'month';
                        const dayStr = format(day, 'yyyy-MM-dd');
                        const isHoliday = holidayDates.has(dayStr);

                        return (
                            <div
                                key={day.toString()}
                                className={`
                                    p-2 bg-white relative group transition-colors flex flex-col gap-1
                                    ${view === 'month' ? 'min-h-[140px]' : 'min-h-[400px]'}
                                    ${isOutOfMonth ? 'opacity-40 bg-gray-50' : 'hover:bg-blue-50'}
                                    ${isToday(day) ? 'bg-blue-50 ring-2 ring-inset ring-blue-500' : ''}
                                    ${isHoliday && !isOutOfMonth ? 'bg-red-50/30' : ''}
                                `}
                            >
                                <div className="flex items-center gap-1 mb-1">
                                    <span className={`
                                        text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full
                                        ${isToday(day) ? 'bg-blue-600 text-white' : 'text-gray-500'}
                                    `}>
                                        {format(day, 'd')}
                                    </span>
                                    {isHoliday && !isOutOfMonth && (
                                        <span className="text-[9px] font-bold text-red-500 uppercase tracking-tight">Festivo</span>
                                    )}
                                </div>

                                <div className="flex-1 flex flex-col gap-2 overflow-hidden">
                                    {shifts.map((shift, idx) => {
                                        const style = shiftStyle(shift.type);
                                        return (
                                            <div key={idx} className={`text-xs p-2 rounded border-l-4 shadow-sm ${style.bg}`}>
                                                <div className="font-bold text-gray-800">{shift.emp}</div>
                                                <div className="text-gray-500 text-[10px] mt-0.5 flex justify-between">
                                                    <span>{shift.time}</span>
                                                    <span className="uppercase font-bold tracking-tighter opacity-70">
                                                        {style.label}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
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
                    <div className="w-3 h-3 bg-pink-50 border border-pink-400 rounded"></div> Festivo (trabajado)
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
                            {employees.map(emp => {
                                let totalAssigned = 0;
                                // Only count days that belong to the current month
                                days.forEach(day => {
                                    if (view === 'month' && !isSameMonth(day, baseDate)) return;
                                    const shifts = getShiftsForDay(day);
                                    shifts.forEach(shift => {
                                        if (shift.emp === emp.name && shift.time !== 'CERRADO') {
                                            const [start, end] = shift.time.split(' - ');
                                            if (!start || !end) return;
                                            const [sh, sm] = start.split(':').map(Number);
                                            const [eh, em] = end.split(':').map(Number);
                                            const duration = (eh + em / 60) - (sh + sm / 60);
                                            if (duration > 0) totalAssigned += duration;
                                        }
                                    });
                                });

                                const monthlyTarget = (emp.weekly_hours / 7) * actualDaysInMonth;
                                const difference = totalAssigned - monthlyTarget;

                                return (
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
                                                <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded">Deficit</span>
                                            }
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </Card>
        </main>
    );
}
