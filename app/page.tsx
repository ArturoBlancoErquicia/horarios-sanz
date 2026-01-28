import Link from 'next/link';
import { getAllStores, getEmployeesByStore } from '@/lib/data';
import { Calendar } from 'lucide-react';
import { Card } from '@/components/Card';

export default function Home() {
  const stores = getAllStores();

  return (
    <main className="min-h-screen p-8 max-w-7xl mx-auto font-[family-name:var(--font-geist-sans)]">
      {/* Header Styled like Reference */}
      <Card className="mb-8 border-t-4 border-t-blue-800">
        <div className="flex flex-col md:flex-row justify-between items-center text-center md:text-left">
          <div>
            <h1 className="text-2xl font-black text-gray-800 uppercase tracking-tight">
              Panel de Control
            </h1>
            <p className="text-gray-500 text-sm mt-1">Gestión de Horarios - Hornos Sanz</p>
          </div>
          <div className="mt-4 md:mt-0 px-3 py-1 bg-gray-100 text-gray-500 text-xs font-mono rounded">
            v1.0
          </div>
        </div>
      </Card>

      <section>
        <div className="flex items-center gap-2 mb-6">
          <div className="bg-blue-600 text-white w-8 h-8 flex items-center justify-center rounded font-bold">1</div>
          <h2 className="text-blue-900 font-bold text-xl uppercase">Selecciona una Tienda</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {stores.map((store) => {
            const employees = getEmployeesByStore(store.id);

            return (
              <Card
                key={store.id}
                title={store.name}
                className="hover:shadow-xl transition-all duration-200 aspect-square transform hover:-translate-y-1"
                action={<span className="text-xs bg-white/20 text-white px-2 py-1 rounded font-bold">ID: {store.id}</span>}
              >
                <div className="flex flex-col h-full justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded border border-gray-100">
                      <span className="text-sm text-gray-600">Empleados</span>
                      <span className="text-lg font-bold text-gray-900">{employees.length}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 p-2 rounded w-fit">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      Operativo
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <Link href={`/store/${store.id}/schedule`} className="w-full">
                      <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded text-sm font-bold flex items-center justify-center gap-1 transition-colors">
                        <Calendar size={16} />
                        Calendario
                      </button>
                    </Link>
                    <Link href={`/store/${store.id}`} className="w-full">
                      <button className="w-full border border-gray-300 hover:bg-gray-50 text-gray-700 py-2 rounded text-sm font-medium transition-colors">
                        Gestionar
                      </button>
                    </Link>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-12 text-center text-gray-400 text-xs uppercase tracking-widest">
        Hornos Sanz Interno
      </footer>
    </main>
  );
}
