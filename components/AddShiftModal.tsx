'use client';

import { useState } from 'react';
import { X, Plus, Clock, AlertCircle } from 'lucide-react';
import { createManualShift } from '@/app/actions';
import { Employee } from '@/lib/types';

interface AddShiftModalProps {
    isOpen: boolean;
    onClose: () => void;
    date: string;
    storeId: number;
    employees: Employee[];
}

const TYPE_OPTIONS = [
    { value: 'work', label: 'Trabajo' },
    { value: 'reinforcement', label: 'Refuerzo' },
    { value: 'absence', label: 'Ausencia' },
];

export function AddShiftModal({ isOpen, onClose, date, storeId, employees }: AddShiftModalProps) {
    const [employeeId, setEmployeeId] = useState<number | ''>('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [type, setType] = useState('work');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const resetForm = () => {
        setEmployeeId('');
        setStartTime('');
        setEndTime('');
        setType('work');
        setError('');
        setLoading(false);
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const handleSave = async () => {
        // Validation
        if (!employeeId) {
            setError('Selecciona un empleado.');
            return;
        }
        if (!startTime || !endTime) {
            setError('Las horas de inicio y fin son obligatorias.');
            return;
        }
        if (startTime >= endTime) {
            setError('La hora de inicio debe ser anterior a la hora de fin.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const result = await createManualShift(
                employeeId as number,
                storeId,
                date,
                startTime,
                endTime,
                type,
            );

            if (result.success) {
                handleClose();
                window.location.reload();
            } else {
                setError(result.error ?? 'Error al crear el turno.');
            }
        } catch {
            setError('Error de conexión con el servidor.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="bg-blue-50 p-4 border-b border-blue-100 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-blue-100 rounded-full text-blue-600">
                            <Plus size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-blue-900">Nuevo Turno</h3>
                            <p className="text-xs text-blue-700">{date}</p>
                        </div>
                    </div>
                    <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4">
                    {/* Employee select */}
                    <div className="space-y-1">
                        <label className="text-sm font-bold text-gray-700">Empleado</label>
                        <select
                            value={employeeId}
                            onChange={(e) => setEmployeeId(e.target.value ? Number(e.target.value) : '')}
                            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm bg-white"
                        >
                            <option value="">-- Seleccionar empleado --</option>
                            {employees.map((emp) => (
                                <option key={emp.id} value={emp.id}>
                                    {emp.name} ({emp.weekly_hours}h)
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Time inputs */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-bold text-gray-700 flex items-center gap-1">
                                <Clock size={14} />
                                Hora inicio
                            </label>
                            <input
                                type="time"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-bold text-gray-700 flex items-center gap-1">
                                <Clock size={14} />
                                Hora fin
                            </label>
                            <input
                                type="time"
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
                            />
                        </div>
                    </div>

                    {/* Type select */}
                    <div className="space-y-1">
                        <label className="text-sm font-bold text-gray-700">Tipo de turno</label>
                        <select
                            value={type}
                            onChange={(e) => setType(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm bg-white"
                        >
                            {TYPE_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <AlertCircle size={16} className="text-red-600 mt-0.5 shrink-0" />
                            <p className="text-xs text-red-800">{error}</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="bg-gray-50 p-4 border-t border-gray-100 flex justify-end gap-3">
                    <button
                        onClick={handleClose}
                        className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-200 rounded transition-colors text-sm"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700 transition-colors text-sm shadow-sm disabled:opacity-50"
                    >
                        <Plus size={16} />
                        {loading ? 'Creando...' : 'Crear Turno'}
                    </button>
                </div>
            </div>
        </div>
    );
}
