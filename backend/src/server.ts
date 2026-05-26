import express from 'express';
import mongoose from 'mongoose';
import IORedis from 'ioredis';
import { Queue } from 'bullmq';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = process.env.PORT || 3000;

// 1. CORS aktivieren – WICHTIG: 'DELETE' wurde bei den erlaubten Methoden hinzugefügt!
app.use(cors({
    origin: ['http://localhost:4321', 'http://127.0.0.1:4321'],
    methods: ['GET', 'POST', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// 2. Verbindung zur MongoDB herstellen
const MONGO_URI = process.env.MONGO_URI || 'mongodb://admin:secretpassword@localhost:27017/kinetic?authSource=admin';
mongoose.connect(MONGO_URI)
    .then(() => console.log('Connected to MongoDB successfully'))
    .catch((err) => console.error('MongoDB connection error:', err));

// Das Mongoose-Modell exakt passend zur neuen Struktur definieren
const EventLogSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    gatewayId: { type: String, required: true },
    status: { type: String, required: true, enum: ['PENDING', 'PROCESSING', 'SUCCESS', 'FAILED'] },
    rawPayload: { type: mongoose.Schema.Types.Mixed, required: true },
    transformedPayload: { type: mongoose.Schema.Types.Mixed, default: null },
    errors: { type: [String], default: [] },
    attempts: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
}, {
    suppressReservedKeysWarning: true // Unterdrückt die "errors"-Warnung im Terminal
});

const EventLog = mongoose.model('EventLog', EventLogSchema);

// 3. Redis & BullMQ Queue aufsetzen
const redisConnection = new IORedis({
    host: process.env.REDIS_HOST || 'localhost',
    port: 6379,
    maxRetriesPerRequest: null
});

const webhookQueue = new Queue('webhook-queue', { connection: redisConnection });

// ==========================================
// ROUTE 1: Webhook-Eingang vom Sensor (Gateway)
// ==========================================
app.post('/api/v1/gateways/:gatewayId/webhook', async (req, res) => {
    const { gatewayId } = req.params;
    const rawPayload = req.body;
    const eventId = uuidv4();

    try {
        // Event im Audit-Trail der MongoDB mit Status PENDING anlegen
        await EventLog.create({
            id: eventId,
            gatewayId,
            status: 'PENDING',
            rawPayload,
            attempts: 0,
            errors: []
        });

        // Job an BullMQ/Redis zur asynchronen Bearbeitung übergeben
        await webhookQueue.add('process-webhook', {
            eventId,
            gatewayId,
            rawPayload
        });

        // Sofortige Antwort an das sendende System (Asynchronität)
        return res.status(202).json({
            message: 'Event accepted and queued',
            eventId,
            status: 'PENDING'
        });

    } catch (error: any) {
        console.error('Fehler im Webhook-Gateway:', error.message);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

// ==========================================
// ROUTE 2: Admin-Route für das Astro-Frontend (Alle Logs abrufen)
// ==========================================
app.get('/api/v1/admin/events', async (_req, res) => {
    try {
        // Die neuesten 50 Events abrufen
        const logs = await EventLog.find().sort({ createdAt: -1 }).limit(50);
        return res.json(logs);
    } catch (error: any) {
        return res.status(500).json({ error: 'Fehler beim Laden der Logs' });
    }
});

// ==========================================
// NEUE ROUTE 3: Event dauerhaft aus der MongoDB löschen
// ==========================================
app.delete('/api/v1/admin/events/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const result = await EventLog.findOneAndDelete({ id });

        if (!result) {
            return res.status(404).json({ error: 'Event not found in database' });
        }

        console.log(`[Backend] Event ${id} wurde erfolgreich gelöscht.`);
        return res.json({ message: `Event ${id} successfully deleted from infrastructure.` });
    } catch (error: any) {
        console.error('Fehler beim Löschen des Events:', error.message);
        return res.status(500).json({ error: 'Internal Server Error while deleting' });
    }
});

// Server starten
app.listen(PORT, () => {
    console.log(`Kinetic Ingestion Server is running on port ${PORT}`);
});