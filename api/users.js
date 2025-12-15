import { getUsers, upsertUser } from "../backend/db.js";

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const rows = await getUsers();
      return res.status(200).json(rows);
    }
    if (req.method === "POST") {
      const ct = req.headers["content-type"] || "";
      const inserted = [];
      if (ct.includes("application/json")) {
        const arr = Array.isArray(req.body) ? req.body : [];
        for (const u of arr) {
          if (!u.phone) continue;
          await upsertUser({
            name: u.name || "",
            phone: String(u.phone),
            email: u.email || null,
            optin: Boolean(u.optin),
            tags: u.tags || "",
            status: u.status || ""
          });
          inserted.push(u.phone);
        }
        return res.status(200).json({ imported: inserted.length });
      }
      if (ct.includes("text/csv")) {
        const text = typeof req.body === "string" ? req.body : "";
        const lines = String(text).split(/\r?\n/).filter(Boolean);
        const header = lines.shift() || "";
        const cols = header.split(",");
        const idx = (k) => cols.findIndex((c) => c.trim().toLowerCase() === k);
        const iName = idx("name");
        const iPhone = idx("phone");
        const iEmail = idx("email");
        const iOptin = idx("optin");
        const iTags = idx("tags");
        const iStatus = idx("status");
        for (const line of lines) {
          const parts = line.split(",");
          const phone = parts[iPhone]?.trim();
          if (!phone) continue;
          await upsertUser({
            name: parts[iName]?.trim() || "",
            phone: phone,
            email: parts[iEmail]?.trim() || null,
            optin: String(parts[iOptin] || "").trim().toLowerCase() === "true",
            tags: parts[iTags]?.trim() || "",
            status: parts[iStatus]?.trim() || ""
          });
          inserted.push(phone);
        }
        return res.status(200).json({ imported: inserted.length });
      }
      return res.status(400).json({ error: "unsupported_content_type" });
    }
    return res.status(405).end();
  } catch (e) {
    return res.status(500).json({ error: "users_api_error" });
  }
}
