import Link from 'next/link';
import { getStoreById, getEmployeesByStore } from '@/lib/data';
import { Card } from '@/components/Card';
import { notFound } from 'next/navigation';
import { ArrowLeft, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, startOfWeek, endOfWeek, getDay } from 'date-fns';
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
    const baseDate = date ? new Date(date) : new Date();

    // Calcular Rango de Fechas según vista
    let rangeStart, rangeEnd, dateFormat;

    if (view === 'week') {
        rangeStart = startOfWeek(baseDate, { weekStartsOn: 1 });
        rangeEnd = endOfWeek(baseDate, { weekStartsOn: 1 });
        dateFormat = "'Semana del' d 'de' MMMM";
    } else {
        rangeStart = startOfMonth(baseDate);
        rangeEnd = endOfMonth(baseDate);
        dateFormat = 'MMMM yyyy';
    }

    const days = eachDayOfInterval({ start: rangeStart, end: rangeEnd });
    const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

    // Generador de Turnos Mock
    const getShiftsForDay = (day: Date) => {
        const dayOfWeek = getDay(day);
        if (dayOfWeek === 0 && !store.open_time_sunday) return [];

        const morningEmp = employees[day.getDate() % employees.length];
        const afternoonEmp = employees[(day.getDate() + 1) % employees.length];

        if (!morningEmp) return [];

        return [
            { emp: morningEmp.name, time: '08:00 - 14:00', type: 'opening' },
            { emp: afternoonEmp?.name || employees[0].name, time: '14:00 - 20:30', type: 'closing' }
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
                        <Link href={`?view=${view}&date=${(view === 'week' ? new Date(baseDate.setDate(baseDate.getDate() - 7)) : new Date(baseDate.setMonth(baseDate.getMonth() - 1))).toISOString()}`}>
                            <button className="p-1 hover:bg-gray-100 rounded text-blue-600"><ChevronLeft size={20} /></button>
                        </Link>
                        <span className="text-sm font-bold w-40 text-center capitalize">{format(baseDate, dateFormat, { locale: es })}</span>
                        <Link href={`?view=${view}&date=${(view === 'week' ? new Date(baseDate.setDate(baseDate.getDate() + 14)) : new Date(baseDate.setMonth(baseDate.getMonth() + 2))).toISOString()}`}>
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
                                        <div key={idx} className={`text-xs p-2 rounded border-l-4 shadow-sm ${shift.type === 'opening' ? 'bg-amber-50 border-amber-400' : 'bg-indigo-50 border-indigo-400'}`}>
                                            <div className="font-bold text-gray-800">{shift.emp}</div>
                                            <div className="text-gray-500 text-[10px] mt-0.5 flex justify-between">
                                                <span>{shift.time}</span>
                                                <span className="uppercase font-bold tracking-tighter opacity-70">{shift.type === 'opening' ? 'Apertura' : 'Cierre'}</span>
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
        </main>
    );
}
