import { connectDB } from "../../_lib/mongodb.js";
import Top10 from "../../_lib/models/Top10.js";
import { requireAuth } from "../../_lib/auth.js";
import { withSentry } from "../../_lib/sentry.js";

const emptySlots = () =>
  Array.from({ length: 10 }, (_, i) => ({
    position: i + 1,
    tmdbId: null,
    title: "",
    coverImage: "",
    year: null,
    type: "",
  }));

async function handler(req, res) {
  if (req.method !== "GET")
    return res.status(405).json({ message: "Method not allowed" });

  await connectDB();

  const auth = await requireAuth(req);
  if (auth.error)
    return res.status(auth.status).json({ message: auth.error });

  const { region } = req.query;

  let doc = await Top10.findOne({
    region,
    userId: auth.user._id,
  });

  if (!doc) {
    doc = await Top10.create({
      region,
      userId: auth.user._id,
      entries: emptySlots(),
    });
  }

  res.json(doc);
}
export default withSentry(handler);