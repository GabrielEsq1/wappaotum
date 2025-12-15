import { getCampaign, selectUsersBySegment, insertMessage, updateCampaignStatus } from "../../../backend/db.js";
import { sendTemplate } from "../../../backend/services/whatsapp.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).end();
    const id = Number(req.query.id);
    const campaign = await getCampaign(id);
    if (!campaign) return res.status(404).json({ error: "campaign_not_found" });
    const segment = JSON.parse(campaign.segment || "{}");
    const users = await selectUsersBySegment(segment);
    const results = [];
    for (const u of users) {
      const json = await sendTemplate(u.phone, campaign.template, [u.name]);
      const externalId = json?.messages?.[0]?.id || null;
      await insertMessage({ external_id: externalId, user_id: u.id, campaign_id: id, status: "sent" });
      results.push({ phone: u.phone, externalId });
    }
    await updateCampaignStatus(id, "active");
    return res.status(200).json({ sent: results.length, results });
  } catch (e) {
    return res.status(500).json({ error: "campaign_send_error" });
  }
}
