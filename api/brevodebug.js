// TEMPORARY diagnostic endpoint — verify a Brevo contact's list membership
// and delete test contacts. Removed after the Brevo test is confirmed.
module.exports = async (req, res) => {
  const key = process.env.BREVO_API_KEY;
  const listId = process.env.BREVO_LIST_ID;
  const email = (req.query && req.query.email) || "";
  const action = (req.query && req.query.action) || "get";
  if (!key) return res.status(200).json({ error: "no key" });

  if (action === "delete") {
    const r = await fetch("https://api.brevo.com/v3/contacts/" + encodeURIComponent(email), {
      method: "DELETE", headers: { "api-key": key },
    });
    return res.status(200).json({ deleted: r.status === 204, status: r.status });
  }

  const r = await fetch("https://api.brevo.com/v3/contacts/" + encodeURIComponent(email), {
    headers: { "api-key": key },
  });
  if (r.status !== 200) {
    return res.status(200).json({ found: false, status: r.status });
  }
  const j = await r.json();
  return res.status(200).json({
    found: true,
    email: j.email,
    listIds: j.listIds || [],
    inConfiguredList: (j.listIds || []).indexOf(Number(listId)) !== -1,
    configuredListId: Number(listId),
  });
};
