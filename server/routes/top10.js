const express = require('express');
const router = express.Router();
const auth       = require('../middleware/auth');
const Top10 = require('../models/Top10');

router.use(auth);

// GET a region's top 10
router.get('/:region', async (req, res) => {
  try {
    let doc = await Top10.findOne({ region: req.params.region,userId: req.user._id });
    if (!doc) {
      // Auto-create empty slots 1-10
      doc = await Top10.create({
        region: req.params.region,
        userId: req.user._id,
        entries: Array.from({ length: 10 }, (_, i) => ({
          position: i + 1, tmdbId: null, title: '', coverImage: '', year: null, type: ''
        }))
      });
    }
    res.json(doc);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT update a single slot
router.put('/:region/:position', async (req, res) => {
  try {
    const pos = parseInt(req.params.position);
    const doc = await Top10.findOne({ region: req.params.region,userId: req.user._id });
    if (!doc) return res.status(404).json({ message: 'Region not found' });
    const idx = doc.entries.findIndex(e => e.position === pos);
    if (idx === -1) return res.status(404).json({ message: 'Slot not found' });
    doc.entries[idx] = { position: pos, ...req.body };
    doc.markModified('entries');
    await doc.save();
    res.json(doc);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT clear a single slot
router.delete('/:region/:position', async (req, res) => {
  try {
    const pos = parseInt(req.params.position);
    const doc = await Top10.findOne({ region: req.params.region,userId: req.user._id });
    if (!doc) return res.status(404).json({ message: 'Region not found' });
    const idx = doc.entries.findIndex(e => e.position === pos);
    if (idx !== -1) {
      doc.entries[idx] = { position: pos, tmdbId: null, title: '', coverImage: '', year: null, type: '' };
      doc.markModified('entries');
      await doc.save();
    }
    res.json(doc);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;