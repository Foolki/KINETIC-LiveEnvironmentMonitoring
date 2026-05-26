import { Queue, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';

// Verbindungskonfiguration für den Docker-Redis-Container
const redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    maxRetriesPerRequest: null, // Wichtig für BullMQ
};

// Initialisierung des ioredis-Clients
export const redisConnection = new IORedis(redisConfig);

// Name der Warteschlange
export const QUEUE_NAME = 'webhook-queue';

// Initialisierung der BullMQ-Warteschlange
export const webhookQueue = new Queue(QUEUE_NAME, {
    connection: redisConnection,
    defaultJobOptions: {
        attempts: 3, // Automatische Wiederholung im Fehlerfall (auf Queue-Ebene)
        backoff: {
            type: 'exponential',
            delay: 5000, // Wartet 5 Sekunden vor dem ersten Retry, dann 10, dann 20...
        },
    },
});

// Event-Listener zur Überwachung der Queue-Aktivitäten (optional für Logs)
export const queueEvents = new QueueEvents(QUEUE_NAME, {
    connection: redisConnection,
});

queueEvents.on('failed', ({ jobId, failedReason }) => {
    console.error(`[Queue Error] Job ${jobId} ist fehlgeschlagen. Grund: ${failedReason}`);
});