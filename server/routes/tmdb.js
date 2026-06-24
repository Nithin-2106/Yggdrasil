const express = require('express');
const router = express.Router();
const axios = require('axios');

const TMDB_KEY = process.env.TMDB_KEY;
const TMDB_BASE = 'https://api.themoviedb.org/3';

router.use(async (req, res) => {
  try {
    const url = `${TMDB_BASE}${req.path}`;

    const response = await axios.get(url, {
      params: {
        ...req.query,
        api_key: TMDB_KEY,
      },
    });

    res.json(response.data);
  } catch (err) {
    res.status(err.response?.status || 500).json({
      message: err.response?.data || err.message,
    });
  }
});

module.exports = router;