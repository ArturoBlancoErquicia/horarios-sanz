import { getAllEmployees, getEmployeesByStore, Employee } from './data';
import db from './db';

interface Candidate extends Employee {
    score: number;
    reason: string[];
}

// Simulación de verificación de horario (al no haber calendario real aún)
function isEmployeeBusy(employeeId: number, date: string, start: string, end: string): boolean {
    // Aquí consultaríamos la tabla 'schedules'. Por ahora, asumimos libre.
    return false;
}

export function findSubstitutes(storeId: number, date: string, startTime: string, endTime: string): Candidate[] {
    const allEmployees = getAllEmployees();
    const candidates: Candidate[] = [];

    for (const emp of allEmployees) {
        // 1. Filtro Duro: Disponibilidad
        if (isEmployeeBusy(emp.id, date, startTime, endTime)) {
            continue;
        }

        let score = 0;
        const reasons: string[] = [];

        // 2. Ranking

        // A. Misma Tienda (+1000 puntos) - Prioridad máxima
        if (emp.store_id === storeId) {
            score += 1000;
            reasons.push('Personal de la misma tienda');
        } else {
            reasons.push(`De otra tienda (ID: ${emp.store_id})`);
        }

        // B. Horas de contrato (Priorizar quienes tienen más horas disponibles)
        // Simplificación: Asumimos que queremos dar horas a quienes tienen contrato alto
        // En realidad, deberíamos calcular (HorasContrato - HorasAsignadas)
        score += emp.weekly_hours;

        // C. Reglas especiales (Texto)
        if (emp.rules.toLowerCase().includes('refuerzo')) {
            score += 50; // Es personal de refuerzo, bueno para cubrir
            reasons.push('Perfil de refuerzo');
        }

        candidates.push({ ...emp, score, reason: reasons });
    }

    // Ordenar por score descendente
    return candidates.sort((a, b) => b.score - a.score);
}
