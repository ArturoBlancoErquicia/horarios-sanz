import Link from 'next/link';
import { getStoreById, getEmployeesByStore } from '@/lib/data';
import { Card } from '@/components/Card';
import { EmployeeCard } from '@/components/EmployeeCard';
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

                    {employees.map((emp) => (
                        <EmployeeCard key={emp.id} employee={emp} />
                    ))}
                </div>
            </div>
        </main>
    );
}
