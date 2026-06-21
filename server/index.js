const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');

dotenv.config({ path: '../.env' });
connectDB();

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/anime', require('./routes/anime'));
app.use('/api/manga', require('./routes/manga'));
app.use('/api/drama', require('./routes/drama'));
app.use('/api/top10', require('./routes/top10'));
app.use('/api/animetop10', require('./routes/animetop10'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));