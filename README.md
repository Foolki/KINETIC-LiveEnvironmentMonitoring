KINETIC - Live Environment Monitoring System
KINETIC is a modular system for real-time environmental data monitoring. The application is designed for the ingestion, transformation, and visualization of sensor data, including PM2.5, PM10, NO2, and Ozone levels.

Technical Architecture
Frontend: Astro (Framework for high-performance web interfaces)

Backend: Express.js API for log management and system control

Worker: BullMQ-based engine for asynchronous data processing and transformation

Database: MongoDB (Mongoose) for persistent storage of sensor data

System Components
Ingestion: Interface for receiving raw sensor data payloads.

Processing: Queue-based processing handled by BullMQ, including error handling and retry mechanisms.

Dashboard: Web interface for monitoring system status and processed environmental data.

Installation and Deployment
Prerequisites
Node.js (LTS version)

Redis (required for BullMQ)

MongoDB

Setup
Clone the repository:
git clone https://github.com/foolki/KINETIC-LiveEnvironmentMonitoring.git
cd KINETIC

Configuration:
Create a .env file in the root directory with the following variables:
PUBLIC_API_BASE_URL=http://localhost:3000/api/v1
PUBLIC_ADMIN_TOKEN=your_secure_token
MONGODB_URI=your_mongodb_connection_string
REDIS_URL=redis://localhost:6379

Install dependencies:
npm install

Start development environment:
npm run dev

Key Features
Data Processing: Automated transformation and enrichment of raw sensor inputs.

Fault Tolerance: Built-in retry logic for failed processing steps.

Administration: Log overview and manual control of event processing.

Authentication: Secure access to API endpoints via admin tokens.

License
This project is licensed under the MIT License.
