const express = require("express");
const router = express.Router();
const os = require("os");
const redisStore = require("../config/redis");
const monitor = require("../middleware/monitor");
const db = require("../config/db");

router.get("/status", async (req, res) => {
    const metrics = monitor.getMetrics();
    
    // Get stock of a sample product (e.g., ID 1) or total stock
    const stockProduct1 = await redisStore.getStock(1);

    res.json({
        stockProduct1,
        ...metrics,
        system: {
            memory: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2) + "MB",
            specCPU: os.cpus().length + " Cores",
            uptime: Math.floor(process.uptime()) + "s",
            redis: redisStore.getRedisStatus() ? "CONNECTED" : "OFFLINE"
        }
    });
});

router.post("/buy", async (req, res) => {
    const productId = req.body.productId || 1; // Default to ID 1 for simulation
    const quantity = req.body.quantity || 1;

    const result = await redisStore.buyProduct(productId, quantity);

    if (result.success) {
        res.status(200).json({ success: true, message: "Purchase successful" });
    } else {
        res.status(400).json({ success: false, error: result.error });
    }
});

module.exports = router;
