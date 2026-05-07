require('dotenv').config();
const express = require("express");
const path = require("path");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const { createClient } = require("redis");
const os = require("os");
const app = express();

const PORT = process.env.PORT || 10000;

// Redis Configuration (SECURED)
const redisClient = createClient({
  username: 'default',
  password: process.env.REDIS_PASSWORD,
  socket: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT)
  }
});

let isRedisConnected = false;

redisClient.on('error', err => {
  console.error('Redis Client Error', err);
  isRedisConnected = false;
});

redisClient.connect().then(() => {
  console.log('CONNECTED TO REDIS CLOUD');
  isRedisConnected = true;
}).catch(err => {
  console.error('Redis connection failed, falling back to Local RAM');
});

app.use(morgan("dev"));
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// State Variables
let localTicketsSold = 0;
let totalRequests = 0;
let failedRequests = 0;
let requestLatencies = [];
let recentLogs = [];
let requestsInLastSecond = 0;
let currentRPS = 0;
let peakRPS = 0;

setInterval(() => {
  currentRPS = requestsInLastSecond;
  if (currentRPS > peakRPS) peakRPS = currentRPS;
  requestsInLastSecond = 0;
}, 1000);

app.use((req, res, next) => {
  if (req.path === '/buy') {
    totalRequests++;
    requestsInLastSecond++;
  }

  const start = process.hrtime();
  res.on('finish', () => {
    const diff = process.hrtime(start);
    const durationMs = (diff[0] * 1e9 + diff[1]) / 1e6;

    if (req.path === '/buy') {
      const logEntry = {
        timestamp: new Date().toLocaleTimeString(),
        method: req.method,
        path: req.path,
        status: res.statusCode,
        latency: durationMs.toFixed(2) + "ms"
      };

      recentLogs.push(logEntry);
      if (recentLogs.length > 15) recentLogs.shift();

      if (res.statusCode >= 400) {
        failedRequests++;
      } else {
        requestLatencies.push(durationMs);
        if (requestLatencies.length > 100) requestLatencies.shift();
      }
    }
  });
  next();
});

app.get("/status", async (req, res) => {
  const avgLatency = requestLatencies.length > 0
    ? (requestLatencies.reduce((a, b) => a + b, 0) / requestLatencies.length).toFixed(2)
    : 0;

  const memoryUsage = process.memoryUsage();

  let ticketsSold = localTicketsSold;
  if (isRedisConnected) {
    try {
      const val = await redisClient.get('ticketsSold');
      ticketsSold = val ? parseInt(val) : 0;
    } catch (e) {
      console.error("Redis Get Error", e);
    }
  }

  res.json({
    ticketsSold,
    totalRequests,
    failedRequests,
    currentRPS,
    peakRPS,
    avgLatencyMs: avgLatency,
    logs: recentLogs,
    system: {
      memory: (memoryUsage.heapUsed / 1024 / 1024).toFixed(2) + "MB",
      specCPU: "0.1 vCPU (Shared)",
      specRAM: "512 MB (Free Tier)",
      uptime: Math.floor(process.uptime()) + "s",
      redis: isRedisConnected ? "CONNECTED" : "OFFLINE"
    }
  });
});

app.post("/buy", async (req, res) => {
  if (isRedisConnected) {
    try {
      await redisClient.incr('ticketsSold');
    } catch (e) {
      console.error("Redis Incr Error", e);
      localTicketsSold++;
    }
  } else {
    localTicketsSold++;
  }
  res.status(200).json({ success: true });
});

app.listen(PORT, () => {
  console.log("SYSTEM BOOTED: http://localhost:" + PORT);
});