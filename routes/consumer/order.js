const express = require("express");
const router = express.Router();

const db = require('../../config/db');

router.get("/all", async (req, res) => {
    let client;
    try {
        const consumerID = req.user.id;
        const query = `
            SELECT
                o.id AS id_ordering,
                o.date,
                o.status AS delivery_status,
                JSON_AGG(
                    JSONB_BUILD_OBJECT(
                        'id_fish', f.id,
                        'name', f.name,
                        'price', f.price,
                        'weight', dor.weight,
                        'total_price', dor.weight * f.price,
                        'seller_name', s.name,
                        'location', s.location
                    )
                ) AS fishes
            FROM ordering o
            INNER JOIN detail_ordering dor ON o.id = dor.id_ordering
            INNER JOIN fish f ON dor.id_fish = f.id
            INNER JOIN seller s ON f.id_seller = s.id
            WHERE dor.id_consumer = $1
            GROUP BY o.id, o.date, o.status;`;

        const result = await db.query(query, [consumerID]);
        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "No orders found",
            });
        }
        return res.status(200).json({
            table: "Orders",
            data: result.rows,
        });
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

router.post('/create', async (req, res) => {
    let client;
    try {
        const { date, notes, status, kurir, alamat, invoice_url, latitude, longitude } = req.body;

        const query = `
        INSERT INTO ordering (date, notes, status, kurir, alamat, invoice_url, latitude, longitude)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id AS id_ordering`;

        const result = await db.query(query, [
            date, notes, status, kurir, alamat, invoice_url, latitude, longitude
        ]);

        return res.status(201).json({
            id_ordering: result.rows[0].id_ordering,
            message: "Order created successfully",
        });
    } catch (err) {
        console.error("Error creating order:", err);
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

router.post('/create/detail', async (req, res) => {
    let client;
    try {
        const consumerID = req.user.id;
        const orderingID = req.body.idOrdering;

        const queryGetCart = `
            SELECT * FROM cart 
            WHERE id_consumer = $1`;

        const resultGetCart = await db.query(queryGetCart, [consumerID]);
        if (resultGetCart.rows.length === 0) {
            return res.status(404).json({
                message: "Cart is empty",
            });
        }

        const cartItems = resultGetCart.rows;

        const queryInsertDetailOrdering = `
            INSERT INTO detail_ordering (id_consumer, id_ordering, id_fish, weight)
            VALUES ($1, $2, $3, $4)`;

        for (const item of cartItems) {
            await db.query(queryInsertDetailOrdering, [consumerID, orderingID, item.id_fish, item.weight]);
        }
        // Menghapus item dari keranjang setelah order dibuat
        const queryClearCart = `
            DELETE FROM cart 
            WHERE id_consumer = $1`;
        await db.query(queryClearCart, [consumerID]);

        // Mengurangi weight dari fish yang dipesan
        const queryUpdateFishWeight = `
            UPDATE weight
                SET weight = weight - $1
                FROM fish
                WHERE weight.id = fish.id_weight AND fish.id = $2`;

        for (const item of cartItems) {
            await db.query(queryUpdateFishWeight, [item.weight, item.id_fish]);
        }
        return res.status(201).json({
            id_ordering: orderingID,
            message: "Order details created successfully",
        });
    } catch (err) {
        console.error("Error creating order details:", err);
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