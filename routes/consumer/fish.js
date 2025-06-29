const express = require("express");
const router = express.Router();

const db = require('../../config/db');
const redis = require('../../config/redis');

router.get("/all", async (req, res, next) => {
    let client;
    try {
        // cek di redis ada gak
        const fishAllCache = await redis.GET('fish:all');
        // const fishAllCache = await redis.HGET('fish:all', 'data');
        console.log("fishAllCache:", fishAllCache);

        if (fishAllCache) {
            return res.status(200).json({
                length: JSON.parse(fishAllCache).length,
                message: "Success - All fish (Redis Cache)",
                data: JSON.parse(fishAllCache),
            });
        } else {
            // jika tidak ada di Redis, ambil dari PostgreSQL
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
            } else {
                // simpan hasil query ke Redis dengan tipe data string
                await redis.SET('fish:all', JSON.stringify(result.rows));
                // await redis.HSET('fish:all', 'data', JSON.stringify(result.rows));
            }

            return res.status(200).json({
                length: result.rows.length,
                message: "Success - All fish (PostgreSQL)",
                data: result.rows,
            });
        }
    } catch (err) {
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
        // cek di redis ada gak
        const searchDataRedis = await redis.GET(`fish:search:${fishName}`);
        // const searchDataRedis = await redis.HGET(`fish:search:${fishName}`, 'data');

        if (searchDataRedis) {
            return res.status(200).json({
                length: JSON.parse(searchDataRedis).length,
                message: "Success - Search fish (Redis Cache)",
                data: JSON.parse(searchDataRedis),
            });
        } else if (!searchDataRedis) {
            // jika tidak ada di Redis, ambil dari PostgreSQL
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
            } else {
                // simpan hasil query ke Redis dengan tipe data string
                await redis.SET(`fish:search:${fishName}`, JSON.stringify(result.rows));
                // await redis.HSET(`fish:search:${fishName}`, 'data', JSON.stringify(result.rows));
            }

            return res.status(200).json({
                length: result.rows.length,
                message: "Success - Search fish (PostgreSQL)",
                data: result.rows,
            });
        }
    } catch (err) {
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
        // cek di redis ada gak
        const fishDetailCache = await redis.HGET(`fish:detail:${fishId}`, 'data');
        console.log("fishDetailCache:", fishDetailCache);

        if (fishDetailCache) {
            const fishDetailCacheParsed = JSON.parse(fishDetailCache);
            const weightDetailDB = await db.query(
                `SELECT weight FROM weight WHERE id = $1`,
                [fishDetailCacheParsed.id_weight]
            );
            console.log("weightDetailDB:", weightDetailDB.rows[0]);

            return res.status(200).json({
                length: 1,
                message: `Success - Detail fish ${fishId} (Redis Cache)`,
                data: {
                    id_fish: fishDetailCacheParsed.id_fish,
                    name: fishDetailCacheParsed.name,
                    description: fishDetailCacheParsed.description,
                    price: fishDetailCacheParsed.price,
                    location: fishDetailCacheParsed.location,
                    seller_name: fishDetailCacheParsed.seller_name,
                    photo_url: fishDetailCacheParsed.photo_url,
                    id_weight: fishDetailCacheParsed.id_weight,
                    weight: weightDetailDB.rows[0].weight,
                }, 
            });
        } else if (!fishDetailCache || fishDetailCache === null) {
            // jika tidak ada di Redis, ambil dari PostgreSQL
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

            // simpan hasil query ke Redis dengan tipe data hash
            await redis.HSET(`fish:detail:${fishId}`, 'data', JSON.stringify(result.rows[0]));
            return res.status(200).json({
                length: result.rows.length,
                message: `Success - Detail fish ${fishId} (PostgreSQL)`,
                data: result.rows[0],
            });
        }
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