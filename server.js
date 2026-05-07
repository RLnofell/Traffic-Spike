const express = require("express");
const path = require("path");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const app = express();

const PORT = process.env.PORT || 10000;

app.use(morgan("dev"));
app.use(helmet({
  contentSecurityPolicy: false,
}));
app.use(compression());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

let ticketsSold = 0;
let totalRequests = 0;
let failedRequests = 0;
let requestLatencies = [];
let recentLogs = [];
let requestsInLastSecond = 0;
let currentRPS = 0;
let peakRPS = 0;

// Update RPS every second
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

app.get("/status", (req, res) => {
  const avgLatency = requestLatencies.length > 0
    ? (requestLatencies.reduce((a, b) => a + b, 0) / requestLatencies.length).toFixed(2)
    : 0;

  const memoryUsage = process.memoryUsage();
  
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
      uptime: Math.floor(process.uptime()) + "s"
    }
  });
});

app.post("/buy", (req, res) => {
  // Logic xử lý mua vé (giả lập tốn tài nguyên nhẹ)
  ticketsSold++;
  res.status(200).json({ success: true });
});

app.listen(PORT, () => {
  console.log("SYSTEM BOOTED: http://localhost:" + PORT);
});