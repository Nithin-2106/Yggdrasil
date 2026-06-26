import axios from 'axios'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    // Support both Vercel and Next.js style catch-all params
const rawParams = req.query.params ?? req.query["...params"]

const query = { ...req.query }
delete query.params
delete query["...params"]

const tmdbPath = Array.isArray(rawParams)
  ? rawParams.join("/")
  : rawParams

if (!tmdbPath) {
  return res.status(400).json({ message: "No path provided" })
}

    const tmdbKey = process.env.TMDB_KEY

    if (!tmdbKey) {
      return res.status(500).json({ message: 'TMDB_KEY not configured' })
    }

    const url = `https://api.themoviedb.org/3/${tmdbPath}`

    const response = await axios.get(url, {
      params: {
        ...query,
        api_key: tmdbKey,
      },
      timeout: 10000,
    })

    return res.json(response.data)

  } catch (err) {
    return res.status(err.response?.status || 500).json({
      message: err.response?.data?.status_message || err.message,
    })
  }
}