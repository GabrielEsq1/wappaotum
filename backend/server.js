import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { init, findUserByPhone, insertMessage, setOptinByPhone, stats, updateMessageStatusByExternalId } from "./db.js";
import usersRouter from "./routes/users.js";
import campaignsRouter from "./routes/campaigns.js";
import messagesRouter from "./routes/messages.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ type: ["application/json", "text/json"], limit: "2mb" }));
app.use(express.text({ type: ["text/csv"], limit: "2mb" }));

init();

app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (mode === "subscribe" && token === process.env.VERIFY_TOKEN) return res.status(200).send(challenge);
  res.sendStatus(403);
});

app.post("/webhook", async (req, res) => {
  try {
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
    res.sendStatus(200);
  } catch (e) {
    res.sendStatus(200);
  }
});

app.get("/stats", async (req, res) => {
  try {
    const s = await stats();
    res.json(s);
  } catch (e) {
    res.status(500).json({ error: "stats_error" });
  }
});

app.use("/users", usersRouter);
app.use("/campaigns", campaignsRouter);
app.use("/messages", messagesRouter);

const port = Number(process.env.PORT || 3000);
// Mount /api aliases to align con FASE 1
app.use("/api/users", usersRouter);
app.use("/api/campaigns", campaignsRouter);
app.use("/api/messages", messagesRouter);
app.listen(port, () => {
  console.log(`🚀 Backend running http://localhost:${port}`);
});
