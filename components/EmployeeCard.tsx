'use client';

import { useState } from 'react';
import { Card } from '@/components/Card';
import { SubstituteModal } from '@/components/SubstituteModal';
import { Employee } from '@/lib/types';

interface EmployeeCardProps {
    employee: Employee;
}

export function EmployeeCard({ employee }: EmployeeCardProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <>
            <Card className="border-l-4 border-l-blue-500">
                <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-gray-800">{employee.name}</h3>
                    <span className="text-xs font-mono bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-100">
                        {employee.weekly_hours}h
                    </span>
                </div>
                <p className="text-sm text-gray-500 min-h-[2.5rem] mb-3">
                    {employee.rules}
                </p>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="text-xs px-3 py-1.5 rounded bg-red-50 text-red-600 font-bold border border-red-100 hover:bg-red-100 w-full text-center transition-colors"
                >
                    Registrar Baja
                </button>
            </Card>

            <SubstituteModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                employee={employee}
            />
        </>
    );
}
