'use client'

import React, { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card } from '@/components/Card';
import { getSubstitutionProposals } from '@/app/actions';

export default function IncidencePage() {
    const searchParams = useSearchParams();
    const defaultStoreId = searchParams.get('storeId') || '';

    const [results, setResults] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setLoading(true);
        const formData = new FormData(event.currentTarget);
        const response = await getSubstitutionProposals(formData);
        setResults(response);
        setLoading(false);
    }

    return (
        <main className="min-h-screen p-8 max-w-7xl mx-auto font-[family-name:var(--font-geist-sans)]">
            <h1 className="text-3xl font-black text-gray-800 mb-8 border-b pb-4">Registrar Incidencia / Baja</h1>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Formulario */}
                <Card title="Datos de la Incidencia">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">ID Tienda</label>
                            <input
                                type="number"
                                name="storeId"
                                defaultValue={defaultStoreId}
                                className="w-full p-2.5 rounded border border-gray-300 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Fecha</label>
                            <input
                                type="date"
                                name="date"
                                className="w-full p-2.5 rounded border border-gray-300 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Hora Inicio</label>
                                <input
                                    type="time"
                                    name="start"
                                    className="w-full p-2.5 rounded border border-gray-300 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Hora Fin</label>
                                <input
                                    type="time"
                                    name="end"
                                    className="w-full p-2.5 rounded border border-gray-300 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition"
                                    required
                                />
                            </div>
                        </div>

                        <div className="pt-4">
                            <button
                                type="submit"
                                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold shadow-sm transition flex justify-center"
                                disabled={loading}
                            >
                                {loading ? 'Calculando...' : 'Buscar Sustitutos Inteligentes'}
                            </button>
                        </div>
                    </form>
                </Card>

                {/* Resultados */}
                <div className="space-y-4">
                    {results && results.candidates && (
                        <>
                            <h2 className="text-xl font-bold text-blue-900 border-b pb-2">Propuestas de Sustitución</h2>
                            {results.candidates.map((cand: any, idx: number) => (
                                <Card key={cand.id} className="border-l-4 border-l-green-500 shadow-md">
                                    <div className="flex justify-between items-center mb-3">
                                        <h3 className="font-bold text-lg text-gray-800">Opción {String.fromCharCode(65 + idx)}: {cand.name}</h3>
                                        <span className="text-xs font-bold bg-green-100 text-green-800 px-2 py-1 rounded">Score: {cand.score}</span>
                                    </div>
                                    <ul className="text-sm text-gray-600 list-disc list-inside mb-4 space-y-1">
                                        {cand.reason.map((r: string, i: number) => (
                                            <li key={i}>{r}</li>
                                        ))}
                                        <li className="font-medium text-gray-800">Contrato: {cand.weekly_hours}h</li>
                                    </ul>
                                    <button className="w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded font-bold text-sm shadow-sm transition-colors">
                                        Seleccionar y Notificar
                                    </button>
                                </Card>
                            ))}
                        </>
                    )}
                </div>
            </div>
        </main>
    );
}
