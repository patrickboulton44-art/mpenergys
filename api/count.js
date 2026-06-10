// Click counter for the "let's fix it" button.
// GET  /api/count  -> { count: N }   current total
// POST /api/count  -> { count: N }   add one, return new total
// Storage: Upstash Redis (via Vercel Marketplace), reached over its REST API.

module.exports = async (req, res) => {
  const base =
    process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

  if (!base || !token) {
    return res.status(500).json({ error: "counter database not configured" });
  }

  const cmd = req.method === "POST" ? "incr" : "get";
  try {
    const r = await fetch(`${base}/${cmd}/fixit_clicks`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const j = await r.json();
    const count = Number(j.result) || 0;
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ count });
  } catch (e) {
    return res.status(502).json({ error: "counter database unreachable" });
  }
};
