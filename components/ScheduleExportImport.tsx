'use client';

import { useState, useRef } from 'react';
import { Download, Upload, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface ScheduleExportImportProps {
    storeId: number;
    month: number;
    year: number;
}

export default function ScheduleExportImport({ storeId, month, year }: ScheduleExportImportProps) {
    const [exporting, setExporting] = useState(false);
    const [importing, setImporting] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleExport = async () => {
        setExporting(true);
        setMessage(null);

        try {
            const params = new URLSearchParams({
                storeId: String(storeId),
                month: String(month),
                year: String(year),
            });

            const res = await fetch(`/api/schedule/export?${params}`);

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Error al exportar');
            }

            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;

            // Extract filename from Content-Disposition header or use default
            const disposition = res.headers.get('Content-Disposition');
            const filenameMatch = disposition?.match(/filename="(.+)"/);
            a.download = filenameMatch?.[1] || `cuadrante_${year}_${String(month).padStart(2, '0')}.xlsx`;

            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            setMessage({ type: 'success', text: 'Cuadrante exportado correctamente' });
        } catch (error) {
            setMessage({
                type: 'error',
                text: error instanceof Error ? error.message : 'Error al exportar el cuadrante',
            });
        } finally {
            setExporting(false);
        }
    };

    const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setImporting(true);
        setMessage(null);

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('storeId', String(storeId));

            const res = await fetch('/api/schedule/import', {
                method: 'POST',
                body: formData,
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Error al importar');
            }

            setMessage({ type: 'success', text: data.message });
        } catch (error) {
            setMessage({
                type: 'error',
                text: error instanceof Error ? error.message : 'Error al importar el cuadrante',
            });
        } finally {
            setImporting(false);
            // Reset file input so the same file can be re-selected
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    return (
        <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-3">
                {/* Export Button */}
                <button
                    onClick={handleExport}
                    disabled={exporting}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {exporting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Download className="h-4 w-4" />
                    )}
                    {exporting ? 'Exportando...' : 'Exportar Excel'}
                </button>

                {/* Import Button */}
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-blue-600 bg-white px-4 py-2 text-sm font-medium text-blue-600 shadow-sm transition-colors hover:bg-blue-50 focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2">
                    {importing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Upload className="h-4 w-4" />
                    )}
                    {importing ? 'Importando...' : 'Importar Excel'}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleImport}
                        disabled={importing}
                        className="sr-only"
                    />
                </label>
            </div>

            {/* Status Message */}
            {message && (
                <div
                    className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                        message.type === 'success'
                            ? 'bg-green-50 text-green-700'
                            : 'bg-red-50 text-red-700'
                    }`}
                >
                    {message.type === 'success' ? (
                        <CheckCircle className="h-4 w-4 flex-shrink-0" />
                    ) : (
                        <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    )}
                    {message.text}
                </div>
            )}
        </div>
    );
}
