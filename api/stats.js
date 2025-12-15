import { stats } from "../backend/db.js";

export default async function handler(req, res) {
  try {
    const s = await stats();
    return res.status(200).json(s);
  } catch (e) {
    return res.status(500).json({ error: "stats_error" });
  }
}
