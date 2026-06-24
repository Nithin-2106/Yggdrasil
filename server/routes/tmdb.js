const express = require('express');
const router  = express.Router();
const axios   = require('axios');

const TMDB_KEY  = process.env.TMDB_KEY;
const TMDB_BASE = 'https://api.themoviedb.org/3';

router.get('/*', async (req, res) => {
  try {
    const path   = req.params[0];
    const query  = { ...req.query, api_key: TMDB_KEY };
    const url    = `${TMDB_BASE}/${path}`;
    const response = await axios.get(url, { params: query });
    res.json(response.data);
  } catch (err) {
    const status = err.response?.status || 500;
    res.status(status).json({ message: err.message });
  }
});

module.exports = router;