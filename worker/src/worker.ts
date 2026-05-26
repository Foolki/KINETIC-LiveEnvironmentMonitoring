import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import mongoose from 'mongoose';
import { EventStatus, TransformedPayload } from '../../shared/types';

// Struktur der Open-Meteo API-Antwort für TypeScript definieren
interface OpenMeteoAirQualityResponse {
    current: {
        pm10: number;
        pm2_5: number;
        nitrogen_dioxide: number;
        ozone: number;
    };
}

// 1. Verbindung zur MongoDB
const MONGO_URI = process.env.MONGO_URI || 'mongodb://admin:secretpassword@localhost:27017/kinetic?authSource=admin';
mongoose.connect(MONGO_URI)
    .then(() => console.log('Eco-Worker erfolgreich mit MongoDB verbunden'))
    .catch((err) => console.error('Worker MongoDB Verbindungsfehler:', err));

// Mongoose-Modell registrieren (Unterdrückt die errors-Warnung)
const EventLog = mongoose.model('EventLog', new mongoose.Schema({
    id: String,
    gatewayId: String,
    status: String,
    rawPayload: mongoose.Schema.Types.Mixed,
    transformedPayload: mongoose.Schema.Types.Mixed,
    errors: [String],
    attempts: Number,
    createdAt: Date
}, {
    suppressReservedKeysWarning: true
}));

// 2. Redis-Verbindung für die BullMQ-Warteschlange
const redisConnection = new IORedis({
    host: process.env.REDIS_HOST || 'localhost',
    port: 6379,
    maxRetriesPerRequest: null,
});

console.log('🌱 Eco-Data Ingestion Worker aktiv. Warte auf Sensor-Events...');

// 3. Der BullMQ Worker
const worker = new Worker('webhook-queue', async (job: Job) => {
    const { eventId, gatewayId, rawPayload } = job.data;
    console.log(`\n[Worker] Starte Verarbeitung für Event-ID: ${eventId}`);

    // Status in MongoDB sofort auf PROCESSING setzen
    await EventLog.findOneAndUpdate({ id: eventId }, { status: 'PROCESSING' as EventStatus });

    try {
        // SCHRITT A: Validierung der Live-Koordinaten
        const lat = rawPayload.latitude;
        const lon = rawPayload.longitude;

        if (lat === undefined || lon === undefined) {
            throw new Error("Dateninfrastruktur-Fehler: Sensor-Payload unvollständig. 'latitude' und 'longitude' werden zwingend benötigt!");
        }

        // SCHRITT B: Echtzeit-Umweltdaten von Open-Meteo abrufen
        console.log(`[Worker] Rufe brandaktuelle Luftqualität ab für Koordinaten: Lat ${lat}, Lon ${lon}`);

        const envUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=pm10,pm2_5,nitrogen_dioxide,ozone`;
        const envResponse = await fetch(envUrl);

        if (!envResponse.ok) {
            throw new Error(`Open-Meteo API temporär nicht erreichbar. HTTP-Status: ${envResponse.status}`);
        }

        const envData = await envResponse.json() as OpenMeteoAirQualityResponse;
        const airData = envData.current;

        console.log(`[Worker] Live-Schadstoffdaten empfangen.`);
        console.log(`         -> PM2.5 (Feinstaub): ${airData.pm2_5} µg/m³`);
        console.log(`         -> NO2 (Stickstoff):   ${airData.nitrogen_dioxide} µg/m³`);

        // UNSERE KRITISCHE GRENZWERT-WEICHE:
        // Liegt der Feinstaubwert (PM2.5) über 25 µg/m³, löst das System einen Umweltalarm aus.
        // Das bricht den Job ab und markiert ihn im Dashboard als FAILED (ALARM).
        const PM25_LIMIT = 25;
        if (airData.pm2_5 > PM25_LIMIT) {
            throw new Error(`CRITICAL ECO ALARM: Live-Feinstaubwert von ${airData.pm2_5} µg/m³ überschreitet den Sicherheits-Grenzwert von ${PM25_LIMIT}!`);
        }

        // SCHRITT C: Harmonisierung der Daten in unser Shared-Interface Format
        const transformed: TransformedPayload = {
            userId: `sensor_${Math.random().toString(36).substr(2, 5)}`,
            email: `eco-alert@global-monitoring.org`,
            firstName: `Station [Lat: ${lat} / Lon: ${lon}]`,
            lastName: `Air Quality Monitor`,
            source: `gateway_${gatewayId}`,
            timestamp: new Date().toISOString()
        };


        // SCHRITT E: Erfolg (NORMAL) in MongoDB dokumentieren mit echten Schadstoffwerten
        await EventLog.findOneAndUpdate(
            { id: eventId },
            {
                status: 'SUCCESS' as EventStatus,
                transformedPayload: {
                    ...transformed,
                    pm10: airData.pm10,
                    pm25: airData.pm2_5,
                    no2: airData.nitrogen_dioxide,
                    ozone: airData.ozone
                }
            }
        );
        console.log(`[Worker] Event ${eventId} erfolgreich als NORMAL verbucht.`);

    } catch (error: any) {
        console.error(`[Worker ALARM] Event ${eventId} fehlgeschlagen:`, error.message);

        // Fehler im Audit-Trail hinterlegen, damit das Frontend den Alarm rendert
        await EventLog.findOneAndUpdate(
            { id: eventId },
            {
                status: 'FAILED' as EventStatus,
                $push: { errors: error.message },
                $inc: { attempts: 1 }
            }
        );

        // Den Fehler an BullMQ zurückwerfen, um automatische Retries zu ermöglichen
        throw error;
    }
}, { connection: redisConnection });