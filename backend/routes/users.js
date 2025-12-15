import express from "express";
import { getUsers, upsertUser } from "../db.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const rows = await getUsers();
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: "users_list_error" });
  }
});

router.post("/import", async (req, res) => {
  try {
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
      return res.json({ imported: inserted.length });
    }
    if (ct.includes("text/csv")) {
      const text = req.body || "";
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
      return res.json({ imported: inserted.length });
    }
    res.status(400).json({ error: "unsupported_content_type" });
  } catch (e) {
    res.status(500).json({ error: "users_import_error" });
  }
});

export default router;
