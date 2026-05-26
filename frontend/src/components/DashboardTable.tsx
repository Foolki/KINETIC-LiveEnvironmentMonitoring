import React, { useState } from 'react';

interface TransformedPayload {
    pm10: number;
    pm25: number;
    no2: number;
    ozone: number;
    firstName?: string;
    lastName?: string;
    timestamp?: string;
}

interface EventLog {
    id: string;
    gatewayId: string;
    status: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED';
    rawPayload: any;
    transformedPayload?: TransformedPayload;
    errors?: string[];
    attempts?: number;
    createdAt: string; // Das Feld kommt bereits aus der MongoDB
}

interface DashboardTableProps {
    logs: EventLog[];
    onRetrySuccess?: () => void;
}

export const DashboardTable: React.FC<DashboardTableProps> = ({ logs, onRetrySuccess }) => {
    const [citySearch, setCitySearch] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Function for Geocoding & automatic webhook dispatch
    const handleCitySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!citySearch.trim()) return;

        setIsSubmitting(true);
        try {
            const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(citySearch)}&count=1&language=en&format=json`);
            const geoData = await geoRes.json();

            if (!geoData.results || geoData.results.length === 0) {
                alert(`City "${citySearch}" was not found. Please check your spelling.`);
                setIsSubmitting(false);
                return;
            }

            const location = geoData.results[0];
            const { latitude, longitude, name, country } = location;

            const webhookRes = await fetch(`http://localhost:3000/api/v1/gateways/${name.toLowerCase().replace(/ /g, '-')}-sensor/webhook`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    latitude: latitude,
                    longitude: longitude,
                    stationName: `${name} Official Station (${country})`
                })
            });

            if (webhookRes.ok) {
                setCitySearch('');
                window.location.reload();
            } else {
                alert("Error transmitting sensor event to Ingestion Gateway.");
            }
        } catch (error) {
            console.error("Geocoding/Webhook Error:", error);
            alert("Connection failed.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Funktion zum Löschen aus der MongoDB
    const handleDelete = async (eventId: string) => {
        const confirmDelete = window.confirm("Are you sure you want to permanently delete this station log?");
        if (!confirmDelete) return;

        try {
            const response = await fetch(`http://localhost:3000/api/v1/admin/events/${eventId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' }
            });

            if (response.ok) {
                window.location.reload();
            } else {
                const errData = await response.json();
                alert(`Error deleting event: ${errData.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error("Delete Error:", error);
            alert("Connection to the Ingestion Server failed. Please make sure the backend is running on port 3000.");
        }
    };

    // HILFSFUNKTION: Formatiert den MongoDB ISO-String in eine lesbare deutsche Uhrzeit/Datum um
    const formatTimestamp = (isoString: string) => {
        try {
            const date = new Date(isoString);
            return date.toLocaleString('de-DE', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        } catch (e) {
            return 'Unknown Time';
        }
    };

    return (
        <div className="w-full space-y-6">
            {/* Interactive Search & Measurement Station Control panel */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-lg">
                <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                    ➕ Add New Live Monitoring Station
                </h2>
                <form onSubmit={handleCitySubmit} className="flex flex-col sm:flex-row gap-3">
                    <input
                        type="text"
                        value={citySearch}
                        onChange={(e) => setCitySearch(e.target.value)}
                        placeholder="E.g., London, New York, Tokyo..."
                        disabled={isSubmitting}
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors disabled:opacity-50"
                    />
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white font-bold px-6 py-2.5 rounded-lg text-sm transition-colors shadow-md flex items-center justify-center gap-2 whitespace-nowrap"
                    >
                        {isSubmitting ? (
                            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        ) : 'Start Sensor'}
                    </button>
                </form>
                <p className="text-[11px] text-slate-500 mt-2">
                    Automatically converts the city name into geographic coordinates and triggers the Event-Driven Pipeline using BullMQ & Open-Meteo.
                </p>
            </div>

            {/* Ingestion Audit Trail Table */}
            <div className="overflow-x-auto bg-slate-900 border border-slate-800 rounded-xl shadow-xl">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-slate-800 bg-slate-950 text-slate-400 text-xs uppercase tracking-wider font-semibold">
                            <th className="p-4">Eco-Sensor / ID</th>
                            <th className="p-4">Status / Risk</th>
                            <th className="p-4">Raw Data (Payload)</th>
                            <th className="p-4">Real-Time Pollutant Metrics (Open-Meteo)</th>
                            <th className="p-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-sm">
                        {logs.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-slate-500 italic">
                                    No sensor telemetry data found in the system.
                                </td>
                            </tr>
                        ) : (
                            logs.map((log) => (
                                <tr key={log.id} className="hover:bg-slate-850/40 transition-colors">
                                    <td className="p-4">
                                        <div className="font-semibold text-emerald-400 flex items-center gap-1.5">
                                            <span className={`w-2 h-2 rounded-full ${log.status === 'PROCESSING' ? 'bg-amber-400 animate-ping' :
                                                log.status === 'FAILED' ? 'bg-rose-500' : 'bg-emerald-500'
                                                }`}></span>
                                            {log.gatewayId || 'Eco-Sensor'}
                                        </div>

                                        {/* NEU: Formatierter Zeitstempel direkt unter der Station */}
                                        <div className="text-[11px] text-slate-300 font-medium mt-1 flex items-center gap-1">
                                            🕒 {formatTimestamp(log.createdAt)}
                                        </div>

                                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">ID: {log.id}</div>
                                    </td>

                                    <td className="p-4">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold tracking-wide border ${log.status === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                            log.status === 'FAILED' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                                                'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                            }`}>
                                            {log.status === 'SUCCESS' ? 'NORMAL' : log.status === 'FAILED' ? 'ALARM' : 'QUEUE'}
                                        </span>
                                        <div className="text-[10px] text-slate-500 mt-1">Attempts: {log.attempts || 1}</div>
                                    </td>

                                    <td className="p-4 font-mono text-xs max-w-xs truncate text-slate-400">
                                        {JSON.stringify(log.rawPayload)}
                                    </td>

                                    <td className="p-4 max-w-md">
                                        {log.status === 'SUCCESS' && log.transformedPayload ? (
                                            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs font-mono">
                                                <div className="text-slate-400">
                                                    Particulate PM2.5: <span className="text-white font-bold">{log.transformedPayload.pm25} µg/m³</span>
                                                </div>
                                                <div className="text-slate-400">
                                                    Particulate PM10: <span className="text-white font-bold">{log.transformedPayload.pm10} µg/m³</span>
                                                </div>
                                                <div className="text-slate-400">
                                                    Nitrogen Dioxide (NO₂): <span className="text-white font-bold">{log.transformedPayload.no2} µg/m³</span>
                                                </div>
                                                <div className="text-slate-400">
                                                    Ozone (O₃): <span className="text-white font-bold">{log.transformedPayload.ozone} µg/m³</span>
                                                </div>
                                            </div>
                                        ) : log.status === 'FAILED' && log.errors && log.errors.length > 0 ? (
                                            <div className="text-rose-400 text-xs bg-rose-500/5 p-2.5 rounded border border-rose-500/20 font-mono font-bold leading-relaxed shadow-sm">
                                                ⚠️ {log.errors[log.errors.length - 1]}
                                            </div>
                                        ) : (
                                            <div className="text-slate-500 italic text-xs animate-pulse">Awaiting API metrics...</div>
                                        )}
                                    </td>

                                    <td className="p-4 text-right">
                                        <button
                                            onClick={() => handleDelete(log.id)}
                                            className="bg-slate-800 hover:bg-rose-600/80 text-slate-400 hover:text-white font-semibold px-3 py-1.5 rounded-md text-xs shadow-sm transition-all uppercase tracking-wider border border-slate-700 hover:border-rose-500/30"
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};