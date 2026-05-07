const { createClient } = require("redis");

let redisClient = null;
let isRedisConnected = false;
let pendingIncrements = 0;

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
    } catch (err) {
        console.error('EDIS_CLOUD: CONNECTION_FAILED');
        isRedisConnected = false;
    }
};

// Batch update system
setInterval(async () => {
    if (pendingIncrements > 0 && isRedisConnected && redisClient) {
        const toAdd = pendingIncrements;
        pendingIncrements = 0;
        try {
            await redisClient.incrBy('ticketsSold', toAdd);
        } catch (e) {
            isRedisConnected = false;
        }
    }
}, 500);

module.exports = {
    initRedis,
    getRedisStatus: () => isRedisConnected,
    getRedisClient: () => redisClient,
    incrementPending: () => { pendingIncrements++; },
    getTicketsSold: async (localFallback) => {
        if (isRedisConnected && redisClient) {
            try {
                const val = await redisClient.get('ticketsSold');
                return val ? parseInt(val) : 0;
            } catch (e) {
                isRedisConnected = false;
            }
        }
        return localFallback;
    }
};
