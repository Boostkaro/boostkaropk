// BoostKaro WhatsApp webhook endpoint (Meta WhatsApp Business Platform).
// GET  — Meta verification handshake (hub.mode / hub.verify_token / hub.challenge).
// POST — incoming events, acknowledged with 200. For an incoming customer
//        message to the automated number, sends the approved one-time
//        redirect reply (once per customer, tracked in wa_redirect_log).
const VERIFY_TOKEN = "fa73520d429945084a48edcf97ee3928";
const SB_URL = "https://jixdvkssgqitqjucjiob.supabase.co";
const WA_PHONE_ID = process.env.WHATSAPP_PHONE_ID || "1351878108014876";
const GRAPH = "https://graph.facebook.com/v22.0";
const REDIRECT_TEXT = "This is BoostKaro's automated number — it only sends order updates, and we don't reply from here. For any help, please message our customer service on WhatsApp: +92 334 0942542 or visit our website: boostkaropk.com";
const SKIP_SENDERS = new Set(["971562654855", "923340942542", "923348139464"]);

function sbHeaders() {
  const key = process.env.SUPABASE_SERVICE_KEY || "";
  return { apikey: key, Authorization: "Bearer " + key, "Content-Type": "application/json" };
}

async function alreadyReplied(phone) {
  const r = await fetch(SB_URL + "/rest/v1/wa_redirect_log?phone=eq." + phone + "&select=phone&limit=1",
    { headers: sbHeaders() });
  if (!r.ok) return true; // fail closed: never double-send
  const rows = await r.json();
  return rows.length > 0;
}

async function markReplied(phone) {
  await fetch(SB_URL + "/rest/v1/wa_redirect_log", {
    method: "POST",
    headers: Object.assign(sbHeaders(), { Prefer: "resolution=ignore-duplicates" }),
    body: JSON.stringify({ phone }),
  }).catch(() => {});
}

async function sendRedirect(to) {
  if (!process.env.WHATSAPP_TOKEN) return;
  await fetch(GRAPH + "/" + WA_PHONE_ID + "/messages", {
    method: "POST",
    headers: { Authorization: "Bearer " + process.env.WHATSAPP_TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { body: REDIRECT_TEXT } }),
  }).catch(() => {});
}

async function handleIncoming(body) {
  try {
    const entries = (body && body.entry) || [];
    for (const e of entries) {
      for (const ch of e.changes || []) {
        const msgs = (ch.value && ch.value.messages) || [];
        for (const m of msgs) {
          const from = String(m.from || "");
          if (!from || SKIP_SENDERS.has(from)) continue;
          if (await alreadyReplied(from)) continue;
          await markReplied(from);
          await sendRedirect(from);
        }
      }
    }
  } catch (err) { /* ack regardless; Meta retries on non-200 */ }
}

module.exports = (req, res) => {
  if (req.method === "GET") {
    const q = req.query || {};
    if (q["hub.mode"] === "subscribe" && VERIFY_TOKEN && q["hub.verify_token"] === VERIFY_TOKEN) {
      res.status(200).send(q["hub.challenge"]);
    } else {
      res.status(403).send("Verification failed");
    }
    return;
  }
  if (req.method === "POST") {
    res.status(200).json({ received: true });
    let body = req.body;
    if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = null; } }
    if (body) handleIncoming(body);
    return;
  }
  res.status(405).send("Method not allowed");
};
