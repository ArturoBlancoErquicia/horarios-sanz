import { NextResponse } from 'next/server';
import { getAllHolidays, addHoliday, removeHoliday } from '@/lib/holidays';

export async function GET() {
    try {
        const holidays = getAllHolidays();
        return NextResponse.json(holidays);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch holidays' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { date, name } = body;

        if (!date || !name) {
            return NextResponse.json({ error: 'Date and name are required' }, { status: 400 });
        }

        addHoliday(date, name);
        console.log(`Added holiday: ${date} - ${name}`);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Failed to add holiday', details: String(error) }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

        removeHoliday(parseInt(id));
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete holiday' }, { status: 500 });
    }
}
