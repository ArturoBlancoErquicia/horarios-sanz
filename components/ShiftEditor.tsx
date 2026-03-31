'use client';

import { useState } from 'react';
import { X, Clock, Trash2, Save, AlertCircle } from 'lucide-react';
import { createManualShift, removeShift } from '@/app/actions';

interface ShiftEditorProps {
    isOpen: boolean;
    onClose: () => void;
    shift: {
        scheduleId?: number;
        employeeName: string;
        startTime: string;
        endTime: string;
        type: string;
        date: string;
        storeId: number;
        employeeId: number;
    } | null;
}

const TYPE_OPTIONS = [
    { value: 'work', label: 'Trabajo' },
    { value: 'reinforcement', label: 'Refuerzo' },
    { value: 'absence', label: 'Ausencia' },
];

export function ShiftEditor({ isOpen, onClose, shift }: ShiftEditorProps) {
    const [startTime, setStartTime] = useState(shift?.startTime ?? '');
    const [endTime, setEndTime] = useState(shift?.endTime ?? '');
    const [type, setType] = useState(shift?.type ?? 'work');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Sync local state when shift prop changes
    if (shift && startTime === '' && endTime === '') {
        // Only set on first render with a new shift
    }

    const resetAndClose = () => {
        setError('');
        setLoading(false);
        onClose();
    };

    const handleSave = async () => {
        if (!shift) return;

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
            // If the shift has a scheduleId, remove the old one first, then create updated
            if (shift.scheduleId) {
                const removeResult = await removeShift(shift.scheduleId, shift.storeId);
                if (!removeResult.success) {
                    setError(removeResult.error ?? 'Error al eliminar el turno anterior.');
                    setLoading(false);
                    return;
                }
            }

            const result = await createManualShift(
                shift.employeeId,
                shift.storeId,
                shift.date,
                startTime,
                endTime,
                type,
            );

            if (result.success) {
                resetAndClose();
                window.location.reload();
            } else {
                setError(result.error ?? 'Error al guardar el turno.');
            }
        } catch {
            setError('Error de conexión con el servidor.');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!shift?.scheduleId) return;
        if (!confirm('¿Eliminar este turno?')) return;

        setLoading(true);
        setError('');

        try {
            const result = await removeShift(shift.scheduleId, shift.storeId);
            if (result.success) {
                resetAndClose();
                window.location.reload();
            } else {
                setError(result.error ?? 'Error al eliminar el turno.');
            }
        } catch {
            setError('Error de conexión con el servidor.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !shift) return null;

    const isDbShift = shift.scheduleId !== undefined;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="bg-blue-50 p-4 border-b border-blue-100 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-blue-100 rounded-full text-blue-600">
                            <Clock size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-blue-900">Editar Turno</h3>
                            <p className="text-xs text-blue-700">{shift.date}</p>
                        </div>
                    </div>
                    <button onClick={resetAndClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4">
                    {/* Employee (read-only) */}
                    <div className="space-y-1">
                        <label className="text-sm font-bold text-gray-700">Empleado</label>
                        <p className="p-2 bg-gray-100 rounded text-gray-800 text-sm">{shift.employeeName}</p>
                    </div>

                    {!isDbShift && (
                        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                            <AlertCircle size={16} className="text-amber-600 mt-0.5 shrink-0" />
                            <p className="text-xs text-amber-800">
                                Este turno fue generado por la lógica automática. Al guardar se creará una entrada manual en la base de datos.
                            </p>
                        </div>
                    )}

                    {/* Time inputs */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-bold text-gray-700">Hora inicio</label>
                            <input
                                type="time"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-bold text-gray-700">Hora fin</label>
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
                        <label className="text-sm font-bold text-gray-700">Tipo</label>
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
                <div className="bg-gray-50 p-4 border-t border-gray-100 flex justify-between">
                    <div>
                        {isDbShift && (
                            <button
                                onClick={handleDelete}
                                disabled={loading}
                                className="flex items-center gap-1 px-3 py-2 text-red-600 font-bold hover:bg-red-100 rounded transition-colors text-sm disabled:opacity-50"
                            >
                                <Trash2 size={16} />
                                Eliminar
                            </button>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={resetAndClose}
                            className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-200 rounded transition-colors text-sm"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={loading}
                            className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700 transition-colors text-sm shadow-sm disabled:opacity-50"
                        >
                            <Save size={16} />
                            {loading ? 'Guardando...' : 'Guardar'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
