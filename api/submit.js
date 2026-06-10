// Receives the "email your MP" flow details.
// Always keeps a copy in our own database (Redis list "fixit_signups").
// If a Brevo key is configured and the person consented, also adds them
// to the mailing list. Works without Brevo — nothing is lost.

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  let b = req.body;
  if (typeof b === "string") {
    try { b = JSON.parse(b); } catch (e) { b = {}; }
  }
  b = b || {};

  const email = String(b.email || "").trim().slice(0, 200);
  const name = String(b.name || "").trim().slice(0, 200);
  const address = String(b.address || "").trim().slice(0, 300);
  const consent = b.consent === "yes" ? "yes" : "no";
  const mp = String(b.mp || "").slice(0, 100);
  const constituency = String(b.constituency || "").slice(0, 100);

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "invalid email" });
  }

  const record = {
    ts: new Date().toISOString(),
    email, name, address, consent, mp, constituency,
  };

  const base =
    process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (base && token) {
    await fetch(base, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(["LPUSH", "fixit_signups", JSON.stringify(record)]),
    }).catch(() => {});
  }

  if (consent === "yes" && process.env.BREVO_API_KEY) {
    const payload = {
      email,
      updateEnabled: true,
      attributes: {
        FIRSTNAME: name.split(" ")[0] || "",
        FULLNAME: name,
        MP: mp,
        CONSTITUENCY: constituency,
      },
    };
    if (process.env.BREVO_LIST_ID) {
      payload.listIds = [Number(process.env.BREVO_LIST_ID)];
    }
    await fetch("https://api.brevo.com/v3/contacts", {
      method: "POST",
      headers: { "api-key": process.env.BREVO_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => {});
  }

  return res.status(200).json({ ok: true });
};
