const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: 'Anime routes working' });
});

module.exports = router;