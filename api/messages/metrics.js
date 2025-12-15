import { messageCountsByCampaign } from "../../backend/db.js";

export default async function handler(req, res) {
  try {
    const campaignId = Number(req.query.campaign_id);
    const rows = await messageCountsByCampaign(campaignId);
    return res.status(200).json(rows);
  } catch (e) {
    return res.status(500).json({ error: "metrics_error" });
  }
}
