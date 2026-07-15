import axios from "axios";
import { withSentry } from "./_lib/sentry.js";

// Comma-separated list of allowed origins, e.g.:
// "https://yggdrasil-realms.vercel.app,http://localhost:5173"
// Falls back to allowing nothing (same-origin only, since this proxy
// is normally called from the same Vercel deployment it lives on) if
// the env var isn't set — fails closed rather than open.
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map(o => o.trim())
  .filter(Boolean);

async function handler(req, res) {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Vary", "Origin");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const { path, ...query } = req.query;

  if (!path) {
    return res.status(400).json({ message: "No path provided" });
  }

  const tmdbKey = process.env.TMDB_KEY;

  if (!tmdbKey) {
    return res.status(500).json({ message: "TMDB_KEY not configured" });
  }

  try {
    const response = await axios.get(
      `https://api.themoviedb.org/3/${path}`,
      {
        params: {
          ...query,
          api_key: tmdbKey,
        },
        timeout: 10000,
      }
    );

    return res.status(200).json(response.data);
  } catch (err) {
    return res.status(err.response?.status || 500).json({
      message: err.response?.data?.status_message || err.message,
    });
  }
}
export default withSentry(handler);