import { findUserByPhone, insertMessage, setOptinByPhone, updateMessageStatusByExternalId } from "../backend/db.js";

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const mode = req.query["hub.mode"];
      const token = req.query["hub.verify_token"];
      const challenge = req.query["hub.challenge"];
      if (mode === "subscribe" && token === process.env.VERIFY_TOKEN) return res.status(200).send(challenge);
      return res.status(403).end();
    }
    if (req.method === "POST") {
      const entry = req.body?.entry?.[0]?.changes?.[0]?.value || {};
      const msg = entry?.messages?.[0] || null;
      const statuses = entry?.statuses || [];
      if (msg?.from) {
        const phone = msg.from;
        const text = msg?.text?.body || "";
        const user = await findUserByPhone(phone);
        if (text.trim().toLowerCase() === "stop") await setOptinByPhone(phone, false);
        if (user) await insertMessage({ external_id: msg.id || null, user_id: user.id, campaign_id: null, status: "replied" });
      }
      for (const s of statuses) {
        if (s?.id && s?.status) await updateMessageStatusByExternalId(s.id, s.status);
      }
      return res.status(200).end();
    }
    return res.status(405).end();
  } catch (e) {
    return res.status(200).end();
  }
}
