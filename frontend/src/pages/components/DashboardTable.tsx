import React, { useState, useEffect } from 'react';
import { fetchLogs, retryEvent, EventLog } from '../services/api';

export default function DashboardTable() {
    const [logs, setLogs] = useState<EventLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Funktion, um die Daten frisch aus der DB zu laden
    const loadData = async () => {
        try {
            setLoading(true);
            const data = await fetchLogs();
            setLogs(data);
            setError(null);
        } catch (err) {
            setError('Verbindung zum Backend fehlgeschlagen. Läuft der Server auf Port 3000?');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
        // Alle 10 Sekunden automatisch neu laden für das Live-Gefühl
        const interval = setInterval(loadData, 10000);
        return () => clearInterval(interval);
    }, []);

    const handleRetry = async (eventId: string) => {
        const success = await retryEvent(eventId);
        if (success) {
            alert(`Event wurde erfolgreich neu in die Warteschlange eingereiht!`);
            loadData(); // Tabelle direkt aktualisieren
        } else {
            alert('Fehler beim Auslösen des Retries.');
        }
    };

    if (loading && logs.length === 0) return <div className="text-white p-6">Lade Dashboard-Daten...</div>;
    if (error) return <div className="text-red-400 p-6">{error}</div>;

    return (
        <div className="bg-slate-900 rounded-xl shadow-2xl border border-slate-800 overflow-hidden">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                <h2 className="text-xl font-bold text-white tracking-wide">Live Audit Trail</h2>
                <button
                    onClick={loadData}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                >
                    Aktualisieren
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-950 text-slate-400 uppercase text-xs tracking-wider border-b border-slate-800">
                            <th className="p-4">Gateway / ID</th>
                            <th className="p-4">Status</th>
                            <th className="p-4">Payload (Eingang)</th>
                            <th className="p-4">Details</th>
                            <th className="p-4 text-right">Aktionen</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-300 text-sm">
                        {logs.map((log) => (
                            <tr key={log.id} className="hover:bg-slate-850/50 transition-colors">
                                {/* Spalte 1: ID und Gateway */}
                                <td className="p-4">
                                    <div className="font-semibold text-white">{log.gatewayId}</div>
                                    <div className="text-xs text-slate-500 font-mono mt-0.5">{log.id}</div>
                                </td>

                                {/* Spalte 2: Status Badge */}
                                <td className="p-4">
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide ${log.status === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                        log.status === 'FAILED' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                                            'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                        }`}>
                                        {log.status}
                                    </span>
                                    <div className="text-xs text-slate-500 mt-1">Versuche: {log.attempts}</div>
                                </td>

                                {/* Spalte 3: Rohes JSON gekürzt */}
                                <td className="p-4 font-mono text-xs max-w-xs truncate text-slate-400">
                                    {JSON.stringify(log.rawPayload)}
                                </td>

                                {/* Spalte 4: Fehler oder Erfolgsergebnis */}
                                <td className="p-4 max-w-sm">
                                    {log.status === 'FAILED' && log.errors.length > 0 ? (
                                        <div className="text-rose-400 text-xs bg-rose-500/5 p-2 rounded border border-rose-500/10 font-mono">
                                            {log.errors[log.errors.length - 1]}
                                        </div>
                                    ) : log.status === 'SUCCESS' ? (
                                        <div className="text-emerald-400 text-xs font-mono">
                                            CRM Sync User ID: {log.transformedPayload?.userId}
                                        </div>
                                    ) : (
                                        <span className="text-slate-500">-</span>
                                    )}
                                </td>

                                {/* Spalte 5: Action Button */}
                                <td className="p-4 text-right">
                                    {log.status === 'FAILED' && (
                                        <button
                                            onClick={() => handleRetry(log.id)}
                                            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-1.5 rounded-md text-xs shadow-md transition-all uppercase tracking-wider"
                                        >
                                            Re-Drive
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}