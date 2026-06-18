const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: 'Manga routes working' });
});

module.exports = router;