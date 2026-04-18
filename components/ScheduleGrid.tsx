'use client';

import { useState } from 'react';
import { format, isSameMonth, isToday } from 'date-fns';
import { Plus } from 'lucide-react';
import { ShiftEditor } from '@/components/ShiftEditor';
import { AddShiftModal } from '@/components/AddShiftModal';
import { Employee } from '@/lib/types';

interface Shift {
    emp: string;
    time: string;
    type: string;
}

interface DayData {
    date: Date;
    dateStr: string;
    shifts: Shift[];
}

interface ScheduleGridProps {
    days: DayData[];
    baseDate: Date;
    view: string;
    storeId: number;
    employees: Employee[];
}

export default function ScheduleGrid({ days, baseDate, view, storeId, employees }: ScheduleGridProps) {
    const [editingShift, setEditingShift] = useState<{
        scheduleId?: number;
        employeeName: string;
        startTime: string;
        endTime: string;
        type: string;
        date: string;
        storeId: number;
        employeeId: number;
    } | null>(null);
    const [addingDate, setAddingDate] = useState<string | null>(null);

    const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

    const handleShiftClick = (shift: Shift, dateStr: string) => {
        if (shift.emp === 'CERRADO') return;
        const parts = shift.time.split(' - ');
        const emp = employees.find(e => e.name === shift.emp);
        setEditingShift({
            employeeName: shift.emp,
            startTime: parts[0] || '',
            endTime: parts[1] || '',
            type: shift.type === 'holiday_shift' ? 'work' : shift.type === 'holiday' ? 'absence' : shift.type === 'standard' ? 'work' : shift.type,
            date: dateStr,
            storeId,
            employeeId: emp?.id || 0,
        });
    };

    return (
        <>
            {/* Grid Header */}
            <div className="grid grid-cols-7 border-b border-gray-200 bg-blue-600 text-white">
                {weekDays.map((day) => (
                    <div key={day} className="p-3 text-center font-bold text-xs uppercase tracking-widest border-r border-blue-500 last:border-r-0">
                        {day}
                    </div>
                ))}
            </div>

            {/* Grid Body */}
            <div className="grid grid-cols-7 bg-gray-200 gap-px border-b border-gray-200">
                {days.map((dayData) => {
                    const { date: day, shifts, dateStr } = dayData;
                    const isCurrentMonth = isSameMonth(day, baseDate);
                    const isOutOfMonth = !isCurrentMonth && view === 'month';

                    return (
                        <div
                            key={dateStr}
                            className={`
                                p-2 bg-white relative group transition-colors flex flex-col gap-1
                                ${view === 'month' ? 'min-h-[140px]' : 'min-h-[400px]'}
                                ${isOutOfMonth ? 'opacity-40 bg-gray-50' : 'hover:bg-blue-50'}
                                ${isToday(day) ? 'bg-blue-50 ring-2 ring-inset ring-blue-500' : ''}
                            `}
                        >
                            <div className="flex items-center justify-between mb-1">
                                <span className={`
                                    text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full
                                    ${isToday(day) ? 'bg-blue-600 text-white' : 'text-gray-500'}
                                `}>
                                    {format(day, 'd')}
                                </span>
                                <button
                                    onClick={() => setAddingDate(dateStr)}
                                    className="opacity-0 group-hover:opacity-100 p-0.5 text-blue-400 hover:text-blue-600 hover:bg-blue-100 rounded transition-all"
                                    title="Añadir turno"
                                >
                                    <Plus size={14} />
                                </button>
                            </div>

                            <div className="flex-1 flex flex-col gap-2 overflow-hidden">
                                {shifts.map((shift, idx) => (
                                    <div
                                        key={idx}
                                        onClick={() => handleShiftClick(shift, dateStr)}
                                        className={`text-xs p-2 rounded border-l-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow ${
                                            shift.type === 'opening' ? 'bg-amber-50 border-amber-400' :
                                            shift.type === 'closing' ? 'bg-indigo-50 border-indigo-400' :
                                            shift.type === 'holiday' ? 'bg-red-50 border-red-400' :
                                            shift.type === 'holiday_shift' ? 'bg-pink-50 border-pink-400' :
                                            shift.type === 'reinforcement' ? 'bg-green-50 border-green-400' :
                                            'bg-blue-50 border-blue-400'
                                        }`}
                                    >
                                        <div className="font-bold text-gray-800">{shift.emp}</div>
                                        <div className="text-gray-500 text-[10px] mt-0.5 flex justify-between">
                                            <span>{shift.time}</span>
                                            <span className="uppercase font-bold tracking-tighter opacity-70">
                                                {shift.type === 'opening' ? 'Apertura' :
                                                    shift.type === 'closing' ? 'Cierre' :
                                                    shift.type === 'holiday' ? 'Festivo' :
                                                    shift.type === 'holiday_shift' ? 'Festivo' :
                                                    shift.type === 'reinforcement' ? 'Refuerzo' : 'Jornada'}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Modals */}
            <ShiftEditor
                isOpen={editingShift !== null}
                onClose={() => setEditingShift(null)}
                shift={editingShift}
            />
            <AddShiftModal
                isOpen={addingDate !== null}
                onClose={() => setAddingDate(null)}
                date={addingDate || ''}
                storeId={storeId}
                employees={employees}
            />
        </>
    );
}
