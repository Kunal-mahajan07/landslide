const express = require("express");
const cors = require("cors");
const axios = require("axios");
require("dotenv").config();

const db = require("./db");

const app = express();


// ===================================================
// MIDDLEWARE
// ===================================================

app.use(cors());
app.use(express.json());


// ===================================================
// HOME
// ===================================================

app.get("/", (req, res) => {

    res.json({
        project: "GeoDrishti-NER",
        status: "running",
        service: "Node.js Backend",
        version: "1.0"
    });

});


// ===================================================
// HEALTH CHECK
// ===================================================

app.get("/api/health", async (req, res) => {

    try {

        const [result] = await db.query(
            "SELECT 1 AS connected"
        );

        res.json({

            status: "OK",

            service: "GeoDrishti-NER Backend",

            database:
                result[0].connected === 1
                    ? "MySQL Connected"
                    : "Database Error",

            ml_engine: "Python FastAPI"

        });

    } catch (error) {

        console.error(
            "Database connection error:",
            error.message
        );

        res.status(500).json({

            status: "ERROR",

            service: "GeoDrishti-NER Backend",

            database: "MySQL Not Connected",

            error: error.message

        });

    }

});


// ===================================================
// GET LOCATIONS
// ===================================================

app.get("/api/locations", async (req, res) => {

    try {

        const [locations] = await db.query(
            "SELECT * FROM locations ORDER BY id"
        );

        res.json({

            success: true,

            count: locations.length,

            locations: locations

        });

    } catch (error) {

        console.error(
            "Location error:",
            error.message
        );

        res.status(500).json({

            success: false,

            message: "Unable to fetch locations",

            error: error.message

        });

    }

});


// ===================================================
// GET SENSOR READINGS
// ===================================================

app.get("/api/sensor-readings", async (req, res) => {

    try {

        const [readings] = await db.query(`

            SELECT
                sr.id,
                sr.location_id,
                l.name AS location_name,
                l.state,
                sr.rainfall,
                sr.soil_moisture,
                sr.pore_pressure,
                sr.tilt,
                sr.reading_time

            FROM sensor_readings sr

            JOIN locations l
                ON sr.location_id = l.id

            ORDER BY sr.reading_time DESC

        `);

        res.json({

            success: true,

            count: readings.length,

            readings: readings

        });

    } catch (error) {

        console.error(
            "Sensor reading error:",
            error.message
        );

        res.status(500).json({

            success: false,

            message: "Unable to fetch sensor readings",

            error: error.message

        });

    }

});


// ===================================================
// RISK PREDICTION FROM MYSQL SENSOR DATA
// ===================================================

app.post("/api/predict-risk", async (req, res) => {

    try {

        console.log("----------------------------------------");
        console.log("Risk prediction request received");
        console.log("----------------------------------------");


        // ---------------------------------------------------
        // GET LOCATION ID
        // ---------------------------------------------------

        const locationId = req.body.location_id;


        if (!locationId) {

            return res.status(400).json({

                success: false,

                message: "location_id is required"

            });

        }


        // ---------------------------------------------------
        // GET LATEST SENSOR READING
        // ---------------------------------------------------

        const [sensorRows] = await db.query(
            `
            SELECT
                sr.*,
                l.name AS location_name,
                l.state,
                l.slope_angle
            FROM sensor_readings sr
            JOIN locations l
                ON sr.location_id = l.id
            WHERE sr.location_id = ?
            ORDER BY sr.reading_time DESC
            LIMIT 1
            `,
            [locationId]
        );


        if (sensorRows.length === 0) {

            return res.status(404).json({

                success: false,

                message:
                    "No sensor data found for this location"

            });

        }


        const sensor = sensorRows[0];


        // ---------------------------------------------------
        // PROTOTYPE GEOTECHNICAL PARAMETERS
        // ---------------------------------------------------

        const riskInput = {

            cohesion: 20,

            normal_stress: 100,

            pore_pressure: Number(
                sensor.pore_pressure
            ),

            friction_angle: 30,

            shear_stress: 50,

            ml_probability: 0.72,

            rainfall: Number(
                sensor.rainfall
            )

        };


        console.log("Risk input:");
        console.log(riskInput);


        // ---------------------------------------------------
        // SEND DATA TO PYTHON ML ENGINE
        // ---------------------------------------------------

        const response = await axios.post(

            "http://127.0.0.1:8000/predict",

            riskInput

        );


        // ---------------------------------------------------
        // GET PYTHON PREDICTION
        // ---------------------------------------------------

        const prediction =
            response.data.prediction;


        console.log("Python prediction:");
        console.log(prediction);


        // ---------------------------------------------------
        // SAVE PREDICTION TO MYSQL
        // ---------------------------------------------------

        await db.query(
            `
            INSERT INTO predictions
            (
                location_id,
                factor_of_safety,
                ml_probability,
                rainfall,
                risk_score,
                risk_level
            )
            VALUES (?, ?, ?, ?, ?, ?)
            `,
            [

                sensor.location_id,

                prediction.factor_of_safety,

                prediction.ml_probability,

                prediction.rainfall_mm,

                prediction.risk_score,

                prediction.risk_level

            ]
        );


        console.log(
            "Prediction saved to MySQL successfully"
        );


        // ===================================================
        // STEP 3.19
        // CREATE ALERT FOR WARNING / CRITICAL
        // ===================================================

        if (
            prediction.risk_level === "Warning" ||
            prediction.risk_level === "Critical"
        ) {

            let alertMessage;


            if (
                prediction.risk_level === "Critical"
            ) {

                alertMessage =
                    `Critical landslide risk detected at ${sensor.location_name}. Immediate attention required.`;

            } else {

                alertMessage =
                    `Warning: Elevated landslide risk detected at ${sensor.location_name}. Monitor the location closely.`;

            }


            // ---------------------------------------------------
            // SAVE ALERT TO MYSQL
            // ---------------------------------------------------

            await db.query(
                `
                INSERT INTO alerts
                (
                    location_id,
                    risk_level,
                    message,
                    status
                )
                VALUES (?, ?, ?, ?)
                `,
                [

                    sensor.location_id,

                    prediction.risk_level,

                    alertMessage,

                    "ACTIVE"

                ]
            );


            console.log(
                `ALERT CREATED: ${prediction.risk_level}`
            );

        }


        // ---------------------------------------------------
        // RETURN COMPLETE RESULT
        // ---------------------------------------------------

        res.json({

            success: true,

            location: {

                id: sensor.location_id,

                name: sensor.location_name,

                state: sensor.state,

                slope_angle: sensor.slope_angle

            },

            sensor_data: {

                rainfall: sensor.rainfall,

                soil_moisture: sensor.soil_moisture,

                pore_pressure: sensor.pore_pressure,

                tilt: sensor.tilt,

                reading_time: sensor.reading_time

            },

            risk_analysis: prediction

        });


    } catch (error) {

        console.error(
            "Risk prediction error:",
            error.message
        );


        res.status(500).json({

            success: false,

            message: "Risk prediction failed",

            error: error.message

        });

    }

});


// ===================================================
// GET PREDICTION HISTORY
// ===================================================

app.get("/api/predictions", async (req, res) => {

    try {

        const [predictions] = await db.query(`

            SELECT

                p.id,

                p.location_id,

                l.name AS location_name,

                l.state,

                p.factor_of_safety,

                p.ml_probability,

                p.rainfall,

                p.risk_score,

                p.risk_level,

                p.prediction_time

            FROM predictions p

            JOIN locations l
                ON p.location_id = l.id

            ORDER BY p.prediction_time DESC

        `);


        res.json({

            success: true,

            count: predictions.length,

            predictions: predictions

        });


    } catch (error) {

        console.error(
            "Prediction history error:",
            error.message
        );


        res.status(500).json({

            success: false,

            message:
                "Unable to fetch prediction history",

            error: error.message

        });

    }

});


// ===================================================
// GET ALERTS
// ===================================================

app.get("/api/alerts", async (req, res) => {

    try {

        const [alerts] = await db.query(`

            SELECT

                a.id,

                a.location_id,

                l.name AS location_name,

                l.state,

                a.risk_level,

                a.message,

                a.status,

                a.created_at

            FROM alerts a

            JOIN locations l
                ON a.location_id = l.id

            ORDER BY a.created_at DESC

        `);


        res.json({

            success: true,

            count: alerts.length,

            alerts: alerts

        });


    } catch (error) {

        console.error(
            "Alert history error:",
            error.message
        );


        res.status(500).json({

            success: false,

            message: "Unable to fetch alerts",

            error: error.message

        });

    }

});


// ===================================================
// STEP 3.20
// DASHBOARD API
// ===================================================

app.get("/api/dashboard", async (req, res) => {

    try {

        console.log("----------------------------------------");
        console.log("Dashboard data request received");
        console.log("----------------------------------------");


        // ---------------------------------------------------
        // TOTAL LOCATIONS
        // ---------------------------------------------------

        const [locationResult] = await db.query(`
            SELECT COUNT(*) AS total_locations
            FROM locations
        `);


        // ---------------------------------------------------
        // TOTAL SENSOR READINGS
        // ---------------------------------------------------

        const [sensorResult] = await db.query(`
            SELECT COUNT(*) AS total_sensor_readings
            FROM sensor_readings
        `);


        // ---------------------------------------------------
        // TOTAL PREDICTIONS
        // ---------------------------------------------------

        const [predictionResult] = await db.query(`
            SELECT COUNT(*) AS total_predictions
            FROM predictions
        `);


        // ---------------------------------------------------
        // ACTIVE ALERTS
        // ---------------------------------------------------

        const [activeAlertResult] = await db.query(`
            SELECT COUNT(*) AS active_alerts
            FROM alerts
            WHERE status = 'ACTIVE'
        `);


        // ---------------------------------------------------
        // WARNING ALERTS
        // ---------------------------------------------------

        const [warningResult] = await db.query(`
            SELECT COUNT(*) AS warning_alerts
            FROM alerts
            WHERE risk_level = 'Warning'
        `);


        // ---------------------------------------------------
        // CRITICAL ALERTS
        // ---------------------------------------------------

        const [criticalResult] = await db.query(`
            SELECT COUNT(*) AS critical_alerts
            FROM alerts
            WHERE risk_level = 'Critical'
        `);


        // ---------------------------------------------------
        // LATEST SENSOR READINGS
        // ---------------------------------------------------

        const [latestSensors] = await db.query(`

            SELECT

                sr.id,

                sr.location_id,

                l.name AS location_name,

                l.state,

                sr.rainfall,

                sr.soil_moisture,

                sr.pore_pressure,

                sr.tilt,

                sr.reading_time

            FROM sensor_readings sr

            JOIN locations l
                ON sr.location_id = l.id

            ORDER BY sr.reading_time DESC

            LIMIT 10

        `);


        // ---------------------------------------------------
        // LATEST PREDICTIONS
        // ---------------------------------------------------

        const [latestPredictions] = await db.query(`

            SELECT

                p.id,

                p.location_id,

                l.name AS location_name,

                l.state,

                p.factor_of_safety,

                p.ml_probability,

                p.rainfall,

                p.risk_score,

                p.risk_level,

                p.prediction_time

            FROM predictions p

            JOIN locations l
                ON p.location_id = l.id

            ORDER BY p.prediction_time DESC

            LIMIT 10

        `);


        // ---------------------------------------------------
        // RECENT ALERTS
        // ---------------------------------------------------

        const [recentAlerts] = await db.query(`

            SELECT

                a.id,

                a.location_id,

                l.name AS location_name,

                l.state,

                a.risk_level,

                a.message,

                a.status,

                a.created_at

            FROM alerts a

            JOIN locations l
                ON a.location_id = l.id

            ORDER BY a.created_at DESC

            LIMIT 10

        `);


        // ---------------------------------------------------
        // DASHBOARD RESPONSE
        // ---------------------------------------------------

        res.json({

            success: true,

            project: "GeoDrishti-NER",

            summary: {

                total_locations:
                    locationResult[0].total_locations,

                total_sensor_readings:
                    sensorResult[0].total_sensor_readings,

                total_predictions:
                    predictionResult[0].total_predictions,

                active_alerts:
                    activeAlertResult[0].active_alerts,

                warning_alerts:
                    warningResult[0].warning_alerts,

                critical_alerts:
                    criticalResult[0].critical_alerts

            },

            latest_sensors: latestSensors,

            latest_predictions: latestPredictions,

            recent_alerts: recentAlerts

        });


        console.log(
            "Dashboard data sent successfully"
        );


    } catch (error) {

        console.error(
            "Dashboard API error:",
            error.message
        );


        res.status(500).json({

            success: false,

            message:
                "Unable to load dashboard data",

            error: error.message

        });

    }

});


// ===================================================
// 404 ROUTE
// ===================================================

app.use((req, res) => {

    res.status(404).json({

        success: false,

        message: "Route not found",

        requested_url: req.originalUrl

    });

});


// ===================================================
// ERROR HANDLER
// ===================================================

app.use((error, req, res, next) => {

    console.error(
        "Server Error:",
        error
    );


    res.status(500).json({

        success: false,

        message: "Internal server error"

    });

});


// ===================================================
// START SERVER
// ===================================================

const PORT = process.env.PORT || 5000;


app.listen(PORT, () => {

    console.log(
        "=============================================="
    );

    console.log(
        "       GeoDrishti-NER Backend"
    );

    console.log(
        "=============================================="
    );

    console.log(
        `Server running on: http://localhost:${PORT}`
    );

    console.log(
        `Health check: http://localhost:${PORT}/api/health`
    );

    console.log(
        "ML Engine: http://127.0.0.1:8000"
    );

    console.log(
        "MySQL Database: geodrishti"
    );

    console.log(
        "Prediction API: /api/predict-risk"
    );

    console.log(
        "Prediction History: /api/predictions"
    );

    console.log(
        "Alerts API: /api/alerts"
    );

    console.log(
        "Dashboard API: /api/dashboard"
    );

    console.log(
        "=============================================="
    );

});