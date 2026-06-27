import { connectDB } from "../../_lib/mongodb.js";
import Top10 from "../../_lib/models/Top10.js";
import { requireAuth } from "../../_lib/auth.js";

const emptyEntry = (position) => ({
  position,
  tmdbId: null,
  title: "",
  coverImage: "",
  year: null,
  type: "",
});

export default async function handler(req, res) {
  await connectDB();

  const auth = await requireAuth(req);
  if (auth.error)
    return res.status(auth.status).json({ message: auth.error });

  const { region, position } = req.query;

  let doc = await Top10.findOne({
    region,
    userId: auth.user._id,
  });

  if (!doc)
    return res.status(404).json({
      message: "Region not found",
    });

  const pos = Number(position);
  const idx = doc.entries.findIndex((e) => e.position === pos);

  if (idx === -1)
    return res.status(404).json({
      message: "Slot not found",
    });

  if (req.method === "PUT") {
    const field = `entries.${idx}`;

await Top10.updateOne(
  {
    _id: doc._id,
    userId: auth.user._id,
  },
  {
    $set: {
      [field]: {
        position: pos,
        ...req.body,
      },
    },
  }
);

const updated = await Top10.findById(doc._id);

return res.json(updated);

    return res.json(doc);
  }

  if (req.method === "DELETE") {
    await Top10.updateOne(
  {
    _id: doc._id,
    userId: auth.user._id,
  },
  {
    $set: {
      [field]: {
        position: pos,
        tmdbId: null,
        title: "",
        coverImage: "",
        year: null,
        type: "",
      },
    },
  }
);

const updated = await Top10.findById(doc._id);

return res.json(updated);

    return res.json(doc);
  }

  return res.status(405).json({
    message: "Method not allowed",
  });
}