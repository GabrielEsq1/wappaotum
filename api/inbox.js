import { inbox } from "../backend/db.js";

export default async function handler(req, res) {
  try {
    const limit = Number(req.query.limit || 50);
    const rows = await inbox(limit);
    return res.status(200).json(rows);
  } catch (e) {
    return res.status(500).json({ error: "inbox_error" });
  }
}
