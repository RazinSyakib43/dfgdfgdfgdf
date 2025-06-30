const express = require("express");
const router = express.Router();

const db = require('../../config/db');
const redis = require('../../config/redis');

router.get("/all", async (req, res) => {
    try {
        const sellerID = req.user.id;

        // // Cek di Redis apakah ada cache untuk pesanan masuk dari consumer
        const ordersAllCache = await redis.GET(`orders:all:${sellerID}`);

        if (ordersAllCache) {
            return res.status(200).json({
                length: JSON.parse(ordersAllCache).length,
                message: "Success - All orders (Redis Cache)",
                data: JSON.parse(ordersAllCache),
            });
        } else {
            // Jika tidak ada cache, ambil dari database
            const query = `
            SELECT
                o.id AS id_ordering,
                o.date,
                c.name AS consumer_name,
                c.address AS consumer_address,
                o.status AS delivery_status,
                sum(dor.weight * f.price) AS total_price,
                t.status AS transaction_status,
                    JSON_AGG(
                        JSONB_BUILD_OBJECT(
                            'id_fish', f.id,
                            'name', f.name,
                            'price', f.price,
                            'weight', dor.weight,
                            'total_price', dor.weight * f.price
                        )
                    ) AS fishes
            FROM ordering o
            INNER JOIN detail_ordering dor ON o.id = dor.id_ordering
            INNER JOIN fish f ON dor.id_fish = f.id
            INNER JOIN consumer c ON dor.id_consumer = c.id
            INNER JOIN transaction t ON t.id_ordering = o.id
            WHERE f.id_seller = $1 AND t.status = 'PAID'
            GROUP BY o.id, o.date, c.name, c.address, o.status, t.status`;

            const result = await db.query(query, [sellerID]);
            if (result.rows.length === 0) {
                return res.status(404).json({
                    message: "No orders found",
                });
            }

            // Simpan hasil query ke Redis dengan tipe data string
            await redis.SET(`orders:all:${sellerID}`, JSON.stringify(result.rows));

            return res.status(200).json({
                length: result.rows.length,
                message: "Success - All orders (PostgreSQL)",
                data: result.rows,
            });
        }
    } catch (err) {
        console.error("Error fetching orders:", err);
        return res.status(500).json({
            message: "Internal Server Error",
            error: err.message,
        });
    } finally {
        if (client) {
            client.release();
        }
    }
});

module.exports = router;