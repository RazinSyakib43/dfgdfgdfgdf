const { createClient } = require('redis');

const redis = createClient({
    socket: {
        host: "43.0.2.20",
        port: 6379
    }
});

console.log("Connecting to Redis...");
redis.connect()
    .then(() => {
        console.log("Connected to Redis successfully.");
    })
    .catch((err) => {
        console.error("Failed to connect to Redis:", err);
    });
redis.on('error', (err) => {
    console.error('Redis error:', err);
});

module.exports = redis;