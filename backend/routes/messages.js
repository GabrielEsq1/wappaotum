import express from "express";
import { messageCountsByCampaign } from "../db.js";

const router = express.Router();

router.get("/metrics", async (req, res) => {
  try {
    const campaignId = Number(req.query.campaign_id);
    const rows = await messageCountsByCampaign(campaignId);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: "metrics_error" });
  }
});

export default router;
