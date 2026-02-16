import Link from 'next/link';
import { getStoreById, getEmployeesByStore } from '@/lib/data';
import { Card } from '@/components/Card';
import { notFound } from 'next/navigation';
import { ArrowLeft, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, startOfWeek, endOfWeek, getDay, addMonths, subMonths, addWeeks, subWeeks } from 'date-fns';
import { es } from 'date-fns/locale';

export default async function SchedulePage({ params, searchParams }: { params: Promise<{ id: string }>, searchParams: Promise<{ view?: string, date?: string }> }) {
    const { id: idParam } = await params;
    const { view = 'month', date } = await searchParams; // 'month' | 'week'

    const id = parseInt(idParam);
    const store = getStoreById(id);

    if (!store) {
        notFound();
    }

    const employees = getEmployeesByStore(id);

    // Fecha Base
    // Append T12:00:00 to avoid timezone shifts when parsing YYYY-MM-DD
    const baseDate = date ? new Date(date.includes('T') ? date : `${date}T12:00:00`) : new Date();

    // Calcular Rango de Fechas según vista
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
    const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

    // Generador de Turnos Mock
    const { getAllHolidays } = await import('@/lib/holidays');
    const holidays = getAllHolidays();

    const getShiftsForDay = (day: Date) => {
        // Determine day type
        const dateStr = format(day, 'yyyy-MM-dd');
        const isHoliday = holidays.find(h => h.date === dateStr);
        const dayOfWeek = getDay(day); // 0 = Sunday, 1 = Monday, ...

        let openTime, closeTime;

        if (isHoliday || dayOfWeek === 0) {
            // Domingo o Festivo
            openTime = store.open_time_sunday;
            closeTime = store.close_time_sunday;
        } else if (dayOfWeek === 6) {
            // Sábado
            openTime = store.open_time_saturday;
            closeTime = store.close_time_saturday;
        } else {
            // Lunes a Viernes
            openTime = store.open_time_weekday;
            closeTime = store.close_time_weekday;
        }

        // If no hours defined for this day type (e.g. closed Sunday), return empty
        if (!openTime || !closeTime) {
            // If it's a holiday and we have no hours, show "Festivo" closed card
            if (isHoliday) {
                return [{ emp: isHoliday.name, time: 'CERRADO', type: 'holiday' }];
            }
            return [];
        }

        // Assign Employee (Simple rotation based on day of year)
        // Adjust rotation to ensure fairness or matches previous logic
        // For now, keep simple rotation.
        const empIndex = (day.getDate() + (day.getMonth() * 31)) % (employees.length || 1);
        const workingEmp = employees[empIndex];

        if (!workingEmp) return [];

        // Return Single Continuous Shift
        return [
            {
                emp: workingEmp.name,
                time: `${openTime} - ${closeTime}`,
                type: isHoliday ? 'holiday_shift' : 'standard'
            }
        ];
    };

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
                    {/* View Toggle */}
                    <div className="flex bg-gray-100 rounded p-1">
                        <Link href={`?view=month&date=${baseDate.toISOString()}`}>
                            <button className={`px-3 py-1 text-sm font-bold rounded ${view === 'month' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>Mes</button>
                        </Link>
                        <Link href={`?view=week&date=${baseDate.toISOString()}`}>
                            <button className={`px-3 py-1 text-sm font-bold rounded ${view === 'week' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>Semana</button>
                        </Link>
                    </div>

                    <div className="h-6 w-px bg-gray-300 mx-2"></div>

                    {/* Navigation */}
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
                {/* Grid Calendario */}
                <div className="grid grid-cols-7 border-b border-gray-200 bg-blue-600 text-white">
                    {weekDays.map((day) => (
                        <div key={day} className="p-3 text-center font-bold text-xs uppercase tracking-widest border-r border-blue-500 last:border-r-0">
                            {day}
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-7 bg-gray-200 gap-px border-b border-gray-200">
                    {days.map((day, dayIdx) => {
                        const shifts = getShiftsForDay(day);
                        const isCurrentMonth = isSameMonth(day, baseDate);
                        const isOutOfMonth = !isCurrentMonth && view === 'month';

                        return (
                            <div
                                key={day.toString()}
                                className={`
                            p-2 bg-white relative group transition-colors flex flex-col gap-1
                            ${view === 'month' ? 'min-h-[140px]' : 'min-h-[400px]'} 
                            ${isOutOfMonth ? 'opacity-40 bg-gray-50' : 'hover:bg-blue-50'}
                            ${isToday(day) ? 'bg-blue-50 ring-2 ring-inset ring-blue-500' : ''}
                        `}
                            >
                                <span className={`
                            text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full mb-1
                            ${isToday(day) ? 'bg-blue-600 text-white' : 'text-gray-500'}
                        `}>
                                    {format(day, 'd')}
                                </span>

                                <div className="flex-1 flex flex-col gap-2 overflow-hidden">
                                    {shifts.map((shift, idx) => (
                                        <div key={idx} className={`text-xs p-2 rounded border-l-4 shadow-sm ${shift.type === 'opening' ? 'bg-amber-50 border-amber-400' :
                                                shift.type === 'closing' ? 'bg-indigo-50 border-indigo-400' :
                                                    shift.type === 'holiday' ? 'bg-red-50 border-red-400' : // Closed Holiday
                                                        shift.type === 'holiday_shift' ? 'bg-pink-50 border-pink-400' : // Working Holiday
                                                            'bg-blue-50 border-blue-400' // Standard Single Shift
                                            }`}>
                                            <div className="font-bold text-gray-800">{shift.emp}</div>
                                            <div className="text-gray-500 text-[10px] mt-0.5 flex justify-between">
                                                <span>{shift.time}</span>
                                                <span className="uppercase font-bold tracking-tighter opacity-70">
                                                    {shift.type === 'opening' ? 'Apertura' :
                                                        shift.type === 'closing' ? 'Cierre' :
                                                            shift.type === 'holiday' ? 'Festivo' :
                                                                shift.type === 'holiday_shift' ? 'Festivo' : 'Jornada'}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </Card>

            {/* Legend */}
            <div className="mt-4 flex gap-4 text-xs font-bold text-gray-500">
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-amber-50 border border-amber-400 rounded"></div> Aperturas
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-indigo-50 border border-indigo-400 rounded"></div> Cierres
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
                                // Calculate total assigned hours
                                let totalAssigned = 0;
                                days.forEach(day => {
                                    const shifts = getShiftsForDay(day);
                                    shifts.forEach(shift => {
                                        if (shift.emp === emp.name) {
                                            const [start, end] = shift.time.split(' - ');
                                            const [sh, sm] = start.split(':').map(Number);
                                            const [eh, em] = end.split(':').map(Number);
                                            const duration = (eh + em / 60) - (sh + sm / 60);
                                            totalAssigned += duration;
                                        }
                                    });
                                });

                                // Monthly Estimation: Weekly * 4 weeks (Approx)
                                // Better: Weekly / 7 * days in month
                                const daysInMonth = days.length; // Approximate if view is month
                                const monthlyTarget = (emp.weekly_hours / 7) * daysInMonth;
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
                                                <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded">Déficit</span>
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
