'use client';

import React, { useState } from 'react';
import { Card } from './Card';
import { Calendar as CalendarIcon, Trash2, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Holiday {
    id: number;
    date: string;
    name: string;
}

export default function HolidaysManager({ initialHolidays }: { initialHolidays: Holiday[] }) {
    const [holidays, setHolidays] = useState<Holiday[]>(initialHolidays);
    const [newDate, setNewDate] = useState('');
    const [newName, setNewName] = useState('');
    const router = useRouter();

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newDate || !newName) return;

        try {
            const res = await fetch('/api/holidays', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date: newDate, name: newName }),
            });

            if (res.ok) {
                setNewDate('');
                setNewName('');
                router.refresh();
                // Optimistic update or fetch again
                const updatedList = await fetch('/api/holidays', { cache: 'no-store' }).then(r => r.json());
                setHolidays(updatedList);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleDelete = async (id: number) => {
        try {
            const res = await fetch(`/api/holidays?id=${id}`, { method: 'DELETE' });
            if (res.ok) {
                setHolidays(holidays.filter(h => h.id !== id));
                router.refresh();
            }
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <Card title="Días Festivos (Global)" className="border-t-4 border-t-orange-500">
            <div className="space-y-4">
                <form onSubmit={handleAdd} className="flex gap-2 items-end">
                    <div className="flex-1 space-y-1">
                        <label className="text-xs font-bold text-gray-500">Fecha</label>
                        <input
                            type="date"
                            className="w-full border rounded p-2 text-sm"
                            value={newDate}
                            onChange={e => setNewDate(e.target.value)}
                            required
                        />
                    </div>
                    <div className="flex-[2] space-y-1">
                        <label className="text-xs font-bold text-gray-500">Nombre Festivo</label>
                        <input
                            type="text"
                            placeholder="Ej. Año Nuevo"
                            className="w-full border rounded p-2 text-sm"
                            value={newName}
                            onChange={e => setNewName(e.target.value)}
                            required
                        />
                    </div>
                    <button type="submit" className="bg-orange-500 text-white p-2 rounded hover:bg-orange-600 transition">
                        <Plus size={20} />
                    </button>
                </form>

                <div className="max-h-48 overflow-y-auto space-y-2 pr-1 border-t pt-2">
                    {holidays.length === 0 && <p className="text-gray-400 text-sm text-center py-4">No hay festivos registrados.</p>}
                    {holidays.map(h => (
                        <div key={h.id} className="flex justify-between items-center bg-gray-50 p-2 rounded text-sm group hover:bg-gray-100 transition">
                            <div className="flex items-center gap-2">
                                <CalendarIcon size={14} className="text-orange-400" />
                                <span className="font-mono font-bold text-gray-700">{h.date}</span>
                                <span className="text-gray-600">{h.name}</span>
                            </div>
                            <button
                                onClick={() => handleDelete(h.id)}
                                className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </Card>
    );
}
