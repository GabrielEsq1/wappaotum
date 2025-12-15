import https from "https";
import dotenv from "dotenv";

dotenv.config();

export function sendTemplate(phone, template, params) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      messaging_product: "whatsapp",
      to: phone,
      type: "template",
      template: {
        name: template,
        language: { code: "es" },
        components: [
          { type: "body", parameters: (params || []).map((p) => ({ type: "text", text: String(p) })) }
        ]
      }
    });

    const req = https.request({
      hostname: "graph.facebook.com",
      path: `/v19.0/${process.env.PHONE_NUMBER_ID}/messages`,
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload)
      }
    }, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const json = JSON.parse(data || "{}");
          resolve(json);
        } catch (e) {
          resolve({});
        }
      });
    });

    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

export function sendText(phone, text) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      messaging_product: "whatsapp",
      to: phone,
      text: { body: text }
    });

    const req = https.request({
      hostname: "graph.facebook.com",
      path: `/v19.0/${process.env.PHONE_NUMBER_ID}/messages`,
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload)
      }
    }, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const json = JSON.parse(data || "{}");
          resolve(json);
        } catch (e) {
          resolve({});
        }
      });
    });

    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}
