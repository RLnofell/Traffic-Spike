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


let isRedisConnected = false;
let localTicketsSold = 0;
let totalRequests = 0;
let failedRequests = 0;
let requestLatencies = [];
let recentLogs = [];
let requestsInLastSecond = 0;
let currentRPS = 0;
let peakRPS = 0;

const redisHost = process.env.REDIS_HOST;
const redisPort = process.env.REDIS_PORT;
const redisPassword = process.env.REDIS_PASSWORD;

let redisClient = null;

if (redisHost && redisPort) {
  redisClient = createClient({
    username: 'default',
    password: redisPassword,
    socket: {
      host: redisHost,
      port: parseInt(redisPort),
      connectTimeout: 10000
    }
  });

  redisClient.on('error', err => {
    console.error('[REDIS ERROR]', err.message);
    isRedisConnected = false;
  });

  redisClient.connect().then(() => {
    console.log('CONNECTED TO REDIS CLOUD SUCCESS');
    isRedisConnected = true;
  }).catch(err => {
    console.error('Redis connection failed:', err.message);
    isRedisConnected = false;
  });
} else {
  console.warn('⚠️ REDIS CONFIG MISSING: Environment variables not found.');
}

app.use(morgan("tiny"));
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

setInterval(() => {
  currentRPS = requestsInLastSecond;
  if (currentRPS > peakRPS) peakRPS = currentRPS;
  requestsInLastSecond = 0;
}, 1000);

app.use((req, res, next) => {
  if (req.path !== '/buy') return next();

  totalRequests++;
  requestsInLastSecond++;

  const start = process.hrtime();
  res.on('finish', () => {
    const diff = process.hrtime(start);
    const durationMs = (diff[0] * 1e9 + diff[1]) / 1e6;

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
  });
  next();
});

app.get("/status", async (req, res) => {
  const avgLatency = requestLatencies.length > 0
    ? (requestLatencies.reduce((a, b) => a + b, 0) / requestLatencies.length).toFixed(2)
    : 0;

  const memoryUsage = process.memoryUsage();
  let ticketsSold = localTicketsSold;

  if (isRedisConnected && redisClient) {
    try {
      const val = await redisClient.get('ticketsSold');
      ticketsSold = val ? parseInt(val) : 0;
    } catch (e) {
      isRedisConnected = false;
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
      specCPU: os.cpus().length + " Cores",
      uptime: Math.floor(process.uptime()) + "s",
      redis: isRedisConnected ? "CONNECTED" : "OFFLINE"
    }
  });
});

app.post("/buy", (req, res) => {
  if (isRedisConnected && redisClient) {
    redisClient.incr('ticketsSold').catch(e => {
      isRedisConnected = false;
      localTicketsSold++;
    });
  } else {
    localTicketsSold++;
  }
  res.status(200).json({ success: true });
});

app.listen(PORT, () => {
  console.log(`SYSTEM ONLINE: Port ${PORT} | Mode: ${isRedisConnected ? 'REDIS' : 'LOCAL'}`);
});