import express from "express";
import { insertCampaign, getCampaign, selectUsersBySegment, insertMessage, updateCampaignStatus } from "../db.js";
import { sendTemplate } from "../services/whatsapp.js";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const id = await insertCampaign({
      name: req.body?.name,
      template: req.body?.template,
      segment: req.body?.segment || {},
      status: "draft"
    });
    res.json({ id });
  } catch (e) {
    res.status(500).json({ error: "campaign_create_error" });
  }
});

router.post("/:id/send", async (req, res) => {
  try {
    const id = Number(req.params.id);
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
    res.json({ sent: results.length, results });
  } catch (e) {
    res.status(500).json({ error: "campaign_send_error" });
  }
});

export default router;
