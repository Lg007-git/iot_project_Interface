import express from 'express';
import GpsData from '../models/GpsData.js';

const router = express.Router();

// GET all GPS data (sorted by time)
router.get('/', async (req, res) => {
  try {
    const data = await GpsData.find().sort({ timestamp: -1 });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
