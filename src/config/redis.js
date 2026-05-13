const { createClient } = require("redis");
const db = require("./db");

let redisClient = null;
let isRedisConnected = false;

// Lua Script for atomic stock decrement
const BUY_SCRIPT = `
local stockKey = KEYS[1]
local amount = tonumber(ARGV[1])
local currentStock = redis.call("GET", stockKey)

if currentStock and tonumber(currentStock) >= amount then
    redis.call("DECRBY", stockKey, amount)
    return 1
else
    return 0
end
`;

let BUY_SCRIPT_SHA = null;

const initRedis = async () => {
    const host = process.env.REDIS_HOST;
    const port = process.env.REDIS_PORT;
    const password = process.env.REDIS_PASSWORD;

    if (!host || !port) {
        console.warn('REDIS_CONFIG: Missing environment variables.');
        return;
    }

    redisClient = createClient({
        username: 'default',
        password: password,
        socket: {
            host: host,
            port: parseInt(port),
            connectTimeout: 10000
        }
    });

    redisClient.on('error', () => { isRedisConnected = false; });

    try {
        await redisClient.connect();
        console.log('REDIS_CLOUD: CONNECTED');
        isRedisConnected = true;

        // Load Lua script
        BUY_SCRIPT_SHA = await redisClient.scriptLoad(BUY_SCRIPT);
        console.log('LUA_SCRIPTS: LOADED');

        // Initial inventory load
        await loadInventoryToRedis();
    } catch (err) {
        console.error('REDIS_CLOUD: CONNECTION_FAILED');
        isRedisConnected = false;
    }
};

const loadInventoryToRedis = async () => {
    if (!isRedisConnected) return;
    try {
        const { rows } = await db.query('SELECT id, stock FROM products');
        for (const product of rows) {
            await redisClient.set(`stock:${product.id}`, product.stock);
        }
        console.log(`REDIS_SYNC: Loaded ${rows.length} products to cache.`);
    } catch (err) {
        console.error('REDIS_SYNC_ERROR: Failed to load inventory.', err.message);
    }
};

const buyProduct = async (productId, quantity = 1) => {
    if (!isRedisConnected) return { success: false, error: 'Redis Offline' };

    try {
        const result = await redisClient.evalSha(BUY_SCRIPT_SHA, {
            keys: [`stock:${productId}`],
            arguments: [quantity.toString()]
        });

        if (result === 1) {
            // Queue order for Postgres sync
            await redisClient.lPush('order_queue', JSON.stringify({
                productId,
                quantity,
                timestamp: Date.now()
            }));
            return { success: true };
        }
        return { success: false, error: 'Out of Stock' };
    } catch (err) {
        console.error('LUA_EXEC_ERROR:', err.message);
        return { success: false, error: 'System Error' };
    }
};

// Background Worker: Sync orders from Redis to Postgres every 1 second
setInterval(async () => {
    if (!isRedisConnected || !redisClient) return;

    try {
        const orders = [];
        // Batch pull up to 100 orders
        for (let i = 0; i < 100; i++) {
            const data = await redisClient.rPop('order_queue');
            if (!data) break;
            orders.push(JSON.parse(data));
        }

        if (orders.length > 0) {
            const client = await db.pool.connect();
            try {
                await client.query('BEGIN');
                for (const order of orders) {
                    // Update product stock and insert order record
                    await client.query('UPDATE products SET stock = stock - $1 WHERE id = $2', [order.quantity, order.productId]);
                    await client.query('INSERT INTO orders (product_id, quantity) VALUES ($1, $2)', [order.productId, order.quantity]);
                }
                await client.query('COMMIT');
                console.log(`WORKER_SYNC: Synced ${orders.length} orders to PostgreSQL.`);
            } catch (err) {
                await client.query('ROLLBACK');
                console.error('WORKER_SYNC_ERROR: Rollback triggered.', err.message);
                // Re-queue failed orders? (Omitted for simplicity in this demo)
            } finally {
                client.release();
            }
        }
    } catch (err) {
        console.error('WORKER_TICK_ERROR:', err.message);
    }
}, 1000);

module.exports = {
    initRedis,
    getRedisStatus: () => isRedisConnected,
    getRedisClient: () => redisClient,
    buyProduct,
    getStock: async (productId) => {
        if (!isRedisConnected) return 0;
        const val = await redisClient.get(`stock:${productId}`);
        return val ? parseInt(val) : 0;
    },
    getQueueLength: async () => {
        if (!isRedisConnected) return 0;
        try {
            return await redisClient.lLen('order_queue');
        } catch (err) {
            return 0;
        }
    }
};
