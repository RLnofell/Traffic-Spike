# TRAFFIC SPIKE SIMULATION SYSTEM

A high-performance backend simulation system designed to demonstrate scalable architecture, distributed state management via Redis, and advanced throughput optimization techniques.

## Project Objectives

This project showcases the following core engineering skills:
- Handling massive concurrent requests (Traffic Spikes).
- Distributed state persistence using Redis Cloud.
- System performance optimization for resource-constrained environments (0.1 vCPU).
- Production-grade security implementation using Environment Variables and HTTP Headers.

## System Architecture

Client -> Dashboard UI -> Express Server -> Redis Batching System -> Redis Cloud

## Key Technical Features

1. Redis Batching Optimization
Instead of writing to Redis for every single request (which causes network congestion), the system implements a batching mechanism that aggregates data and synchronizes with Redis every 500ms. This technique significantly increases the Requests Per Second (RPS) ceiling.

2. Distributed Persistence
All traffic data and sales counters are persisted on a Redis Cloud instance. This ensures data integrity across server restarts and provides a shared state for horizontal scaling.

3. Real-time Monitoring Dashboard
A custom-built terminal-style interface provides live visibility into critical system metrics:
- Tickets Sold (Real-time synchronization from Redis).
- Current and Peak RPS (Requests Per Second).
- Average Latency (High-resolution timing).
- Memory Heap Usage.

4. Production Hardening
- HTTP security headers management via Helmet.
- Secure configuration management using .env (excluded from version control).
- Optimized logging using Morgan in tiny mode to minimize CPU overhead.

## Deployment and Resource Constraints

This system is specifically optimized for the **Render Free Tier**, which provides extremely limited resources:
- CPU: 0.1 vCPU (Shared)
- RAM: 512 MB
- Network: Limited bandwidth

**Engineering Challenge:** On such a constrained environment, standard I/O patterns would cause a CPU bottleneck. This project demonstrates how to overcome these limitations using **Redis Batching** and **Asynchronous I/O**, achieving high throughput where standard applications would fail.

## Tech Stack

- Backend: Node.js (Express.js)
- Database: Redis Cloud (Distributed Persistence)
- Hosting: Render (Free Tier)
- Security: Helmet.js, Dotenv
- Performance: Custom Batching System, Morgan (Tiny Mode)
- Frontend: Vanilla Javascript, CSS (Glassmorphism & Terminal UI)

## Installation and Local Setup

1. Install dependencies:
npm install

2. Configure Environment Variables:
Create a .env file in the root directory with the following variables:
PORT=10000
REDIS_HOST=your_redis_host
REDIS_PORT=your_redis_port
REDIS_PASSWORD=your_redis_password

3. Start the server:
node server.js

4. Access the Dashboard:
http://localhost:10000

## Performance Metrics (Local Environment)

- Peak Throughput: ~1400 - 1700 RPS.
- Redis Sync Status: Stable under heavy load.
- Resource Efficiency: Optimized for low-spec hardware.

## Author

RainPaul

## Final Note

This project is focused on system architecture and scalability patterns, moving beyond basic CRUD operations to simulate real-world high-traffic challenges.
