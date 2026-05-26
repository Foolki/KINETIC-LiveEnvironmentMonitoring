// Die möglichen Zustände eines Webhooks in der Pipeline
export type EventStatus = 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED';

// Das Standard-Interface für das harmonisierte Event nach der Transformation
export interface TransformedPayload {
    userId: string;
    email: string;
    firstName: string;
    lastName: string;
    source: string;
    timestamp: string;
}

// Das Schema für die MongoDB-Einträge (Audit Trail)
export interface EventLog {
    id: string;
    gatewayId: string;
    status: EventStatus;
    rawPayload: any;
    transformedPayload: TransformedPayload | null;
    errors: string[];
    attempts: number;
    createdAt: Date;
}