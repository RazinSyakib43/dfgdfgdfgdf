const express = require("express");
const router = express.Router();

const db = require('../../config/db');

router.get("/all", async (req, res, next) => {
    let client;
    try {
        const query = `
        SELECT 
            f.id AS id_fish, 
            f.name, 
            f.price, 
            s.location, 
            f.photo_url 
        FROM fish f 
        JOIN seller s 
        ON f.id_seller = s.id`;

        const result = await db.query(query);
        if (result.rows.length === 0 || !result.rows) {
            return res.status(404).json({
                message: "No fish found",
            });
        }
        return res.status(200).json({
            length: result.rows.length,
            message: "Success - All fish (PostgreSQL)",
            data: result.rows,
        });
    }
    catch (err) {
        console.error("Error fetching all fish:", err);
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

router.get("/cari/", async (req, res, next) => {
    let client;
    const fishName = req.query.namaIkan;
    try {
        const query = `
        SELECT 
            f.id AS id_fish,
            f.name, f.price,
            s.location,
            f.photo_url
        FROM fish f
        JOIN seller s
        ON f.id_seller = s.id
        WHERE f.name
        ILIKE $1`;

        const result = await db.query(query, [`%${fishName}%`]);
        if (result.rows.length === 0 || !result.rows) {
            return res.status(404).json({
                message: "Fish not found",
            });
        }
        return res.status(200).json({
            length: result.rows.length,
            message: "Success - Search fish (PostgreSQL)",
            data: result.rows,
        });
    }
    catch (err) {
        console.error("Error searching for fish:", err);
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

router.get("/detail/:id", async (req, res, next) => {
    let client;
    const fishId = req.params.id;
    try {
        const query = `
        SELECT 
            f.id AS id_fish, 
            f.name, 
            f.description,
            f.price, 
            s.location, 
            s.name AS seller_name,
            f.photo_url,
            f.id_weight AS id_weight,
            w.weight
        FROM fish f
        JOIN seller s ON f.id_seller = s.id
        JOIN weight w ON f.id_weight = w.id
        WHERE f.id = $1`;

        const result = await db.query(query, [fishId]);
        if (result.rows.length === 0 || !result.rows) {
            return res.status(404).json({
                message: "Fish not found",
            });
        }
        return res.status(200).json({
            length: result.rows.length,
            message: `Success - Detail fish ${fishId} (PostgreSQL)`,
            data: result.rows[0],
        });
    }
    catch (err) {
        console.error("Error fetching fish details:", err);
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