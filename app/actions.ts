'use server'

import { findSubstitutes } from '@/lib/logic';
import { getStoreById } from '@/lib/data';

export async function getSubstitutionProposals(formData: FormData) {
    const storeId = parseInt(formData.get('storeId') as string);
    const date = formData.get('date') as string;
    const start = formData.get('start') as string;
    const end = formData.get('end') as string;

    if (!storeId || !date || !start || !end) {
        return { error: 'Faltan datos requeridos' };
    }

    const store = getStoreById(storeId);
    const candidates = findSubstitutes(storeId, date, start, end);

    // Devolver top 5
    return {
        success: true,
        candidates: candidates.slice(0, 5),
        searchDetails: { storeName: store?.name, date, start, end }
    };
}
