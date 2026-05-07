let totalRequests = 0;
let failedRequests = 0;
let requestLatencies = [];
let recentLogs = [];
let requestsInLastSecond = 0;
let currentRPS = 0;
let peakRPS = 0;

const monitorMiddleware = (req, res, next) => {
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
};

// RPS Calculator
setInterval(() => {
    currentRPS = requestsInLastSecond;
    if (currentRPS > peakRPS) peakRPS = currentRPS;
    requestsInLastSecond = 0;
}, 1000);

module.exports = {
    monitorMiddleware,
    getMetrics: () => ({
        totalRequests,
        failedRequests,
        currentRPS,
        peakRPS,
        avgLatencyMs: requestLatencies.length > 0
            ? (requestLatencies.reduce((a, b) => a + b, 0) / requestLatencies.length).toFixed(2)
            : 0,
        logs: recentLogs
    })
};
