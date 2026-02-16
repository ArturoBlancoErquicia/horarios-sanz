'use client';

import { useState, useEffect } from 'react';
import { X, Calendar as CalendarIcon, UserCheck, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { getSubstitutes, assignSubstitute } from '@/app/actions';
import { Employee } from '@/lib/types';

interface SubstituteModalProps {
    isOpen: boolean;
    onClose: () => void;
    employee: Employee;
}

export function SubstituteModal({ isOpen, onClose, employee }: SubstituteModalProps) {
    const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [substitutes, setSubstitutes] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleAssign = async (substituteId: number) => {
        if (!confirm('¿Confirmar sustitución?')) return;

        setLoading(true);
        try {
            const result = await assignSubstitute(employee.id, substituteId, date);
            if (result.success) {
                alert('Sustitución registrada correctamente.');
                onClose();
                window.location.reload();
            } else {
                alert('Error al registrar sustitución.');
            }
        } catch (e) {
            alert('Error de conexión.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchSubstitutes(date);
        }
    }, [isOpen, date]);

    const fetchSubstitutes = async (dateStr: string) => {
        setLoading(true);
        setError('');
        try {
            const result = await getSubstitutes(dateStr);
            if (result.success && result.data) {
                setSubstitutes(result.data);
            } else {
                setError('No se pudieron cargar los sustitutos.');
            }
        } catch (e) {
            setError('Error al conectar con el servidor.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="bg-red-50 p-4 border-b border-red-100 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-red-100 rounded-full text-red-600">
                            <AlertCircle size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-red-900">Registrar Baja</h3>
                            <p className="text-xs text-red-700">Empleado: {employee.name}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">
                    {/* Date Selection */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                            <CalendarIcon size={16} />
                            Fecha de la Baja
                        </label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        />
                    </div>

                    {/* Substitutes List */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                            <UserCheck size={16} />
                            Sustitutos Disponibles
                        </h4>

                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-1 max-h-60 overflow-y-auto">
                            {loading ? (
                                <div className="p-8 text-center text-gray-500 text-sm">
                                    Buscando compañeros disponibles...
                                </div>
                            ) : error ? (
                                <div className="p-4 text-center text-red-500 text-sm bg-red-50 m-2 rounded">
                                    {error}
                                </div>
                            ) : substitutes.length === 0 ? (
                                <div className="p-8 text-center text-gray-500 text-sm">
                                    No hay sustitutos disponibles para esta fecha.
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-2 p-2">
                                    {substitutes.map((sub) => (
                                        <div key={sub.id} className="bg-white p-3 rounded border border-gray-200 shadow-sm flex justify-between items-center hover:bg-blue-50 transition-colors cursor-pointer">
                                            <div>
                                                <p className="font-bold text-gray-800">{sub.name}</p>
                                                <p className="text-xs text-gray-500">Tienda ID: {sub.store_id} • {sub.weekly_hours}h</p>
                                            </div>
                                            <button
                                                onClick={() => handleAssign(sub.id)}
                                                className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 font-bold shadow-sm"
                                            >
                                                Seleccionar
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-gray-50 p-4 border-t border-gray-100 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-200 rounded transition-colors text-sm"
                    >
                        Cancelar
                    </button>
                    {/* Could add a 'Confirm' button here if we were saving the leave to DB */}
                </div>
            </div>
        </div>
    );
}
