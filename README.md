KINETIC - Live Environment Monitoring System

KINETIC is a modular, high-performance system designed for real-time environmental data monitoring. It handles the ingestion, automated transformation, and visualization of complex sensor data streams, including PM2.5, PM10, NO2, and Ozone levels.

Architecture Overview
The system follows a decoupled architecture to ensure scalability and reliability:

Frontend: Built with Astro, providing a high-speed, server-optimized dashboard for real-time monitoring.

Backend: A robust Express.js API for secure log management and system administration.

Worker Engine: An asynchronous processing pipeline powered by BullMQ and Redis, ensuring fault-tolerant data transformation.

Database: MongoDB (via Mongoose) provides a flexible schema for persistent storage of environmental logs.

Core Components
Data Ingestion: High-throughput endpoints to receive raw sensor payloads.

Queue-based Processing: Asynchronous tasks with integrated error handling and automatic retry logic.

Admin Dashboard: A secure interface for monitoring system health, reviewing logs, and managing event processing manually.

Getting Started
Prerequisites
Node.js (LTS version)

Redis (Required for BullMQ)

MongoDB

Installation
Clone the repository:

Bash
git clone https://github.com/foolki/KINETIC-LiveEnvironmentMonitoring.git
cd KINETIC
Configuration:
Create a .env file in the root directory:

Plaintext
PUBLIC_API_BASE_URL=http://localhost:3000/api/v1
PUBLIC_ADMIN_TOKEN=your_secure_token
MONGODB_URI=your_mongodb_connection_string
REDIS_URL=redis://localhost:6379
Dependency Management:

Bash
npm install
Development:

Bash
npm run dev
Security & Features
Fault Tolerance: Built-in mechanisms to handle ingestion failures and queue processing retries.

Secure Access: Protected API endpoints utilizing token-based authentication (Bearer tokens) to ensure administrative integrity.

Data Enrichment: Automated, scalable processing pipelines that transform raw sensor inputs into actionable insights.

License
This project is licensed under the MIT License.
