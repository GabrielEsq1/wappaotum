import { insertCampaign } from "../../backend/db.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).end();
    const id = await insertCampaign({
      name: req.body?.name,
      template: req.body?.template,
      segment: req.body?.segment || {},
      status: "draft"
    });
    return res.status(200).json({ id });
  } catch (e) {
    return res.status(500).json({ error: "campaign_create_error" });
  }
}
