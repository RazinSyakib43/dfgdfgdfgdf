const { Pool } = require("pg");

const db = new Pool({
    host: '43.0.2.20',
    user: "postgres",
    password: "yessgood123",
    database: "skripsidb",
    port: 5432,
    connectionTimeoutMillis: 5000, // Timeout after 5 seconds
    max: 50, // Maximum number of connections in the pool
});

console.log("Connecting to PostgreSQL...");
db.connect().then(() => {
    console.log("Connected to PostgreSQL successfully.");
}).catch((err) => {
    console.error("Failed to connect to PostgreSQL:", err);
});

module.exports = db;