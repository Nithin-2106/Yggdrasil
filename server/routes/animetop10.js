const express = require('express');
const router = express.Router();
const AnimeTop10 = require('../models/AnimeTop10');

// GET the single top 10 list
router.get('/', async (req, res) => {
  try {
    let doc = await AnimeTop10.findOne();
    if (!doc) {
      // Auto-create empty 10 slots on first request
      doc = await AnimeTop10.create({
        entries: Array.from({ length: 10 }, (_, i) => ({
          position: i + 1, malId: null, title: '', coverImage: '', year: null, format: ''
        }))
      });
    }
    res.json(doc);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT update a single slot
router.put('/:position', async (req, res) => {
  try {
    const pos = parseInt(req.params.position);
    let doc = await AnimeTop10.findOne();
    if (!doc) return res.status(404).json({ message: 'List not found' });
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

// DELETE clear a single slot
router.delete('/:position', async (req, res) => {
  try {
    const pos = parseInt(req.params.position);
    const doc = await AnimeTop10.findOne();
    if (!doc) return res.status(404).json({ message: 'List not found' });
    const idx = doc.entries.findIndex(e => e.position === pos);
    if (idx !== -1) {
      doc.entries[idx] = { position: pos, malId: null, title: '', coverImage: '', year: null, format: '' };
      doc.markModified('entries');
      await doc.save();
    }
    res.json(doc);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;