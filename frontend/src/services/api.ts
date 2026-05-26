// Nutze Umgebungsvariablen (import.meta.env in Astro)
const API_BASE_URL = import.meta.env.PUBLIC_API_BASE_URL || 'http://localhost:3000/api/v1';
const ADMIN_TOKEN = import.meta.env.PUBLIC_ADMIN_TOKEN;

export interface EventLog {
    _id: string;
    id: string;
    gatewayId: string;
    status: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED';
    rawPayload: any;
    transformedPayload: any;
    errors: string[];
    attempts: number;
    createdAt: string;
}

// 1. Holt die 50 neuesten Logs aus dem Backend
export async function fetchLogs(): Promise<EventLog[]> {
    if (!ADMIN_TOKEN) throw new Error('ADMIN_TOKEN fehlt!');

    const response = await fetch(`${API_BASE_URL}/admin/logs`, {
        headers: {
            'Authorization': `Bearer ${ADMIN_TOKEN}`
        }
    });
    if (!response.ok) throw new Error('Fehler beim Laden der Logs');
    return response.json();
}

// 2. Triggert den manuellen Retry
export async function retryEvent(eventId: string): Promise<boolean> {
    if (!ADMIN_TOKEN) return false;

    const response = await fetch(`${API_BASE_URL}/admin/events/${eventId}/retry`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${ADMIN_TOKEN}`
        }
    });
    return response.ok;
}