const express = require("express");
const path = require("path");
const helmet = require("helmet");
const compression = require("compression");
const app = express();

const PORT = process.env.PORT || 10000;

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

app.use((req, res, next) => {
  if (req.path === '/buy' || req.path === '/status') {
    if (req.path === '/buy') totalRequests++;

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

      if (req.path === '/buy') {
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
  }
  next();
});

app.get("/status", (req, res) => {
  const avgLatency = requestLatencies.length > 0
    ? (requestLatencies.reduce((a, b) => a + b, 0) / requestLatencies.length).toFixed(2)
    : 0;

  res.json({
    ticketsSold,
    totalRequests,
    failedRequests,
    avgLatencyMs: avgLatency,
    logs: recentLogs
  });
});

app.post("/buy", (req, res) => {
  let dummy = 0;
  for (let i = 0; i < 50000; i++) {
    dummy += Math.random();
  }

  ticketsSold++;
  res.status(200).json({ success: true });
});

app.listen(PORT, () => {
  console.log("SYSTEM BOOTED: http://localhost:" + PORT);
});