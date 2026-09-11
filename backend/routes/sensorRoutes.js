const express = require('express');
const router = express.Router();
const SensorHistory = require('../models/SensorHistory');

// POST /api/sensors — record a new sensor reading (from ESP/Arduino or mock)
router.post('/', async (req, res) => {
  try {
    const { temperature, humidity } = req.body;
    if (temperature === undefined || humidity === undefined) {
      return res.status(400).json({ error: 'temperature and humidity are required' });
    }
    const entry = await SensorHistory.create({ temperature, humidity });
    res.status(201).json(entry);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sensors/history?limit=48 — fetch last N readings (default 48)
router.get('/history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 48;
    const records = await SensorHistory.find()
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();
    // Return oldest-first so graphs render chronologically
    res.json(records.reverse());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sensors/latest — get the most recent reading
router.get('/latest', async (req, res) => {
  try {
    const latest = await SensorHistory.findOne().sort({ timestamp: -1 }).lean();
    if (!latest) return res.status(404).json({ error: 'No sensor data yet' });
    res.json(latest);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
