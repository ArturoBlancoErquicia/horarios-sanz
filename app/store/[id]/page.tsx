import Link from 'next/link';
import { getStoreById, getEmployeesByStore } from '@/lib/data';
import { Card } from '@/components/Card';
import { notFound } from 'next/navigation';
import { ArrowLeft, User, Calendar, PlusCircle } from 'lucide-react';

export default async function StorePage({ params }: { params: Promise<{ id: string }> }) {
    const { id: idParam } = await params;
    const id = parseInt(idParam);
    const store = getStoreById(id);

    if (!store) {
        notFound();
    }

    const employees = getEmployeesByStore(id);

    return (
        <main className="min-h-screen p-8 max-w-7xl mx-auto font-[family-name:var(--font-geist-sans)]">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <Link href="/">
                    <button className="p-2 border border-blue-200 rounded text-blue-600 hover:bg-blue-50 transition">
                        <ArrowLeft size={20} />
                    </button>
                </Link>
                <div>
                    <h1 className="text-2xl font-black uppercase text-gray-800">{store.name}</h1>
                    <p className="text-gray-500 text-sm">Gestión de personal</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Quick Actions & Stats */}
                <div className="space-y-6">
                    <Card title="Acciones Rápidas">
                        <div className="space-y-3">
                            <Link href={`/incidence/new?storeId=${store.id}`}>
                                <button className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold shadow-sm transition-all flex items-center justify-center gap-2">
                                    <PlusCircle size={18} />
                                    Registrar Ausencia
                                </button>
                            </Link>
                            <Link href={`/store/${store.id}/schedule`}>
                                <button className="w-full py-3 px-4 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded font-bold transition-all flex items-center justify-center gap-2">
                                    <Calendar size={18} />
                                    Ver Cuadrante Mensual
                                </button>
                            </Link>
                        </div>
                    </Card>

                    <Card title="Información">
                        <div className="space-y-4 text-sm">
                            <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                                <span className="text-gray-500">Apertura L-V</span>
                                <span className="font-mono">{store.open_time_weekday} - {store.close_time_weekday}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-500">Total Plantilla</span>
                                <span className="font-bold bg-gray-100 px-2 rounded">{employees.length}</span>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Right Column: Employee List */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center gap-2 text-blue-900 border-b pb-2">
                        <User size={20} />
                        <h2 className="font-bold text-lg uppercase">Plantilla</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {employees.map((emp) => (
                            <Card key={emp.id} className="border-l-4 border-l-blue-500">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-gray-800">{emp.name}</h3>
                                    <span className="text-xs font-mono bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-100">
                                        {emp.weekly_hours}h
                                    </span>
                                </div>
                                <p className="text-sm text-gray-500 min-h-[2.5rem] mb-3">
                                    {emp.rules}
                                </p>
                                <button className="text-xs px-3 py-1.5 rounded bg-red-50 text-red-600 font-bold border border-red-100 hover:bg-red-100 w-full text-center">
                                    Registrar Baja
                                </button>
                            </Card>
                        ))}
                    </div>
                </div>
            </div>
        </main>
    );
}
