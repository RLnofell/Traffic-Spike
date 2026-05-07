const express = require("express");
const router = express.Router();
const os = require("os");
const redisStore = require("../config/redis");
const monitor = require("../middleware/monitor");

// Local fallback state
let localTicketsSold = 0;

router.get("/status", async (req, res) => {
    const metrics = monitor.getMetrics();
    const ticketsSold = await redisStore.getTicketsSold(localTicketsSold);

    res.json({
        ticketsSold,
        ...metrics,
        system: {
            memory: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2) + "MB",
            specCPU: os.cpus().length + " Cores",
            uptime: Math.floor(process.uptime()) + "s",
            redis: redisStore.getRedisStatus() ? "CONNECTED" : "OFFLINE"
        }
    });
});

router.post("/buy", (req, res) => {
    if (redisStore.getRedisStatus()) {
        redisStore.incrementPending();
    } else {
        localTicketsSold++;
    }
    res.status(200).json({ success: true });
});

module.exports = router;
