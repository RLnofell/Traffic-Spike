const express = require("express");
const router = express.Router();
const os = require("os");
const redisStore = require("../config/redis");
const monitor = require("../middleware/monitor");
const db = require("../config/db");

router.get("/status", async (req, res) => {
    const metrics = monitor.getMetrics();
    
    // Get stock from Redis
    const stockRedis = await redisStore.getStock(1);
    
    // Get stock from Postgres
    let stockDB = 0;
    try {
        const { rows } = await db.query('SELECT stock FROM products WHERE id = 1');
        stockDB = rows[0]?.stock || 0;
    } catch (err) {
        console.error("DB_FETCH_ERROR:", err.message);
    }

    // Get queue length
    const queueSize = await redisStore.getQueueLength();

    res.json({
        stockRedis,
        stockDB,
        queueSize,
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
    const productId = req.body.productId || 1; 
    const quantity = req.body.quantity || 1;

    const result = await redisStore.buyProduct(productId, quantity);

    if (result.success) {
        res.status(200).json({ success: true, message: "Purchase successful" });
    } else {
        res.status(400).json({ success: false, error: result.error });
    }
});

router.post("/reset", async (req, res) => {
    try {
        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');
            await client.query('UPDATE products SET stock = 5000 WHERE id = 1');
            await client.query('TRUNCATE TABLE orders CASCADE');
            await client.query('COMMIT');
            
            // Sync to Redis
            const redisClient = redisStore.getRedisClient();
            if (redisClient) {
                await redisClient.set('stock:1', 5000);
                await redisClient.del('order_queue');
            }
            
            res.json({ success: true, message: "System reset successfully" });
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
