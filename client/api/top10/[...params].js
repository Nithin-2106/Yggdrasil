import { connectDB } from "../_lib/mongodb.js";
import Top10 from "../_lib/models/Top10.js";
import { requireAuth } from "../_lib/auth.js";

const emptySlots = () =>
  Array.from({ length: 10 }, (_, i) => ({
    position: i + 1,
    tmdbId: null,
    title: "",
    coverImage: "",
    year: null,
    type: "",
  }));

export default async function handler(req, res) {
  try {
    await connectDB();

    const auth = await requireAuth(req);
    if (auth.error) {
      return res.status(auth.status).json({ message: auth.error });
    }

    const user = auth.user;

    // Works for Vercel catch-all routes
    let params = req.query["...params"] || req.query.params || [];

    if (!Array.isArray(params)) {
      params = [params];
    }

    const region = params[0];
    const position = params[1] ? Number(params[1]) : null;

    if (!region) {
      return res.status(400).json({ message: "Region required" });
    }

    // Find or create the document
    let doc = await Top10.findOne({
      region,
      userId: user._id,
    });

    if (!doc) {
      doc = await Top10.create({
        region,
        userId: user._id,
        entries: emptySlots(),
      });
    }

    // GET /api/top10/Korean
    if (req.method === "GET" && !position) {
      return res.json(doc);
    }

    // PUT /api/top10/Korean/1
    if (req.method === "PUT" && position) {
      const idx = doc.entries.findIndex(
        (e) => e.position === position
      );

      if (idx === -1) {
        return res.status(404).json({
          message: "Slot not found",
        });
      }

      doc.entries[idx] = {
        position,
        ...req.body,
      };

      doc.markModified("entries");
      await doc.save();

      return res.json(doc);
    }

    // DELETE /api/top10/Korean/1
    if (req.method === "DELETE" && position) {
      const idx = doc.entries.findIndex(
        (e) => e.position === position
      );

      if (idx !== -1) {
        doc.entries[idx] = {
          position,
          tmdbId: null,
          title: "",
          coverImage: "",
          year: null,
          type: "",
        };

        doc.markModified("entries");
        await doc.save();
      }

      return res.json(doc);
    }

    return res.status(405).json({
      message: "Method not allowed",
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      message: err.message,
      stack: process.env.NODE_ENV !== "production" ? err.stack : undefined,
    });
  }
}