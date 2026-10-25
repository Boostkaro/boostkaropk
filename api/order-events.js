// BoostKaro direct order flow — runs on Raji's own Vercel account.
// Called by his Supabase database:
//   - instantly, by a trigger, the moment an order is marked "paid"
//     ({op:"place", order_id}) -> places the order at PakistanPanels
//   - every 15 minutes by pg_cron ({op:"sync"}) -> safety net: places any
//     paid order still waiting, and mirrors provider statuses back.
// Auth: header "x-trigger-key" must match the TRIGGER_KEY env var.
// Secrets live ONLY as Vercel env vars on Raji's account:
//   TRIGGER_KEY (shared with the database), PANEL_API_KEY (PakistanPanels),
//   SUPABASE_SERVICE_KEY (his Supabase service_role key).
const SB_URL = "https://jixdvkssgqitqjucjiob.supabase.co";
const SB_ANON_PUBLIC = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppeGR2a3NzZ3FpdHFqdWNqaW9iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5Njk5NjYsImV4cCI6MjEwNzU0NTk2Nn0._UkyTqLweinByQpoyqXxhv-BIgciRhw59PY6sS8fb2E"; // public anon key (also shipped in app.js)
const PANEL_URL = "https://pakistanpanels.org/api/v2";
// PakistanPanels DISCONNECTED 2026-10-25 (Raji's order): no placements and
// no status mirroring while PANEL_ENABLED is false. WhatsApp notifications
// (notify_new_order / wa_event) are unaffected. The GeoSMM bridge replaces
// this block in the next step.
const PANEL_ENABLED = false;
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const PROVIDER_MAP = {
 "facebook/comments/No Drop": 356,
 "facebook/pagelikes/Droppable": 555,
 "facebook/pagelikes/High Quality": 560,
 "facebook/pagelikes/No Drop": 342,
 "facebook/pagelikesfol/Droppable": 295,
 "facebook/pagelikesfol/High Quality": 297,
 "facebook/pagelikesfol/No Drop": 296,
 "facebook/profilefol/Droppable": 1508,
 "facebook/profilefol/High Quality": 1511,
 "facebook/profilefol/No Drop": 1512,
 "facebook/videoviews/Droppable": 1499,
 "facebook/videoviews/High Quality": 459,
 "facebook/videoviews/No Drop": 332,
 "instagram/comments/No Drop": 966,
 "instagram/followers/Droppable": 1485,
 "instagram/followers/High Quality": 1495,
 "instagram/followers/No Drop": 1492,
 "instagram/likes/Droppable": 1263,
 "instagram/likes/High Quality": 1227,
 "instagram/likes/No Drop": 1129,
 "instagram/views/Droppable": 142,
 "instagram/views/High Quality": 133,
 "instagram/views/No Drop": 134,
 "tiktok/comments/Droppable": 1293,
 "tiktok/comments/High Quality": 1296,
 "tiktok/comments/No Drop": 1310,
 "tiktok/followers/Droppable": 807,
 "tiktok/followers/High Quality": 1020,
 "tiktok/followers/No Drop": 1480,
 "tiktok/likes/Droppable": 15,
 "tiktok/likes/High Quality": 1189,
 "tiktok/likes/No Drop": 1517,
 "tiktok/views/Droppable": 1398,
 "tiktok/views/High Quality": 1124,
 "tiktok/views/No Drop": 1201,
 "youtube/likes/Droppable": 262,
 "youtube/likes/High Quality": 269,
 "youtube/likes/No Drop": 267,
 "youtube/subscribers/Droppable": 1395,
 "youtube/subscribers/No Drop": 1367,
 "youtube/views/Droppable": 228,
 "youtube/views/High Quality": 229,
 "youtube/views/No Drop": 448
};
const MIRROR = { "Pending": "processing", "In progress": "processing",
  "Processing": "processing", "Completed": "completed", "Partial": "completed",
  "Canceled": "cancelled", "Cancelled": "cancelled" };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function sbHeaders() {
  const key = process.env.SUPABASE_SERVICE_KEY || SB_ANON_PUBLIC;
  return { apikey: key, Authorization: "Bearer " + key,
           "Content-Type": "application/json" };
}
async function sbGet(path) {
  const r = await fetch(SB_URL + "/rest/v1/" + path, { headers: sbHeaders() });
  if (!r.ok) throw new Error("supabase GET " + r.status);
  return r.json();
}
async function sbPatch(path, body) {
  const h = sbHeaders(); h.Prefer = "return=representation";
  const r = await fetch(SB_URL + "/rest/v1/" + path,
    { method: "PATCH", headers: h, body: JSON.stringify(body) });
  if (!r.ok) throw new Error("supabase PATCH " + r.status);
  return r.json();
}
async function panel(params) {
  const body = new URLSearchParams(Object.assign(
    { key: process.env.PANEL_API_KEY || "" }, params));
  const r = await fetch(PANEL_URL, { method: "POST",
    headers: { "User-Agent": UA, "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString() });
  if (r.status === 429) { const e = new Error("panel 429"); e.rate = true; throw e; }
  return r.json();
}
function tierFor(order) {
  const label = String(order.quality || "").split(" $")[0].trim();
  const key = order.platform + "/" + order.service_type + "/" + label;
  return { key, service: PROVIDER_MAP[key] };
}

async function placeOrder(order) {
  if (!PANEL_ENABLED) return { placed: false, reason: "panel disconnected" };
  if (!order || order.status !== "paid" || order.provider_order_id) {
    return { placed: false, reason: "not placeable" };
  }
  const t = tierFor(order);
  if (!t.service) return { placed: false, reason: "no provider mapping: " + t.key };
  const link = String(order.profile_link || "").trim();
  if (!/^https?:\/\//i.test(link)) return { placed: false, reason: "bad link" };
  // Claim the order so a trigger + cron overlap cannot place it twice.
  const claim = await sbPatch(
    "orders?id=eq." + order.id + "&provider_order_id=is.null" +
    "&or=(provider_status.is.null,provider_status.neq.Placing)",
    { provider_status: "Placing" });
  if (!claim.length) return { placed: false, reason: "already claimed" };
  try {
    const res = await panel({ action: "add", service: String(t.service),
      link, quantity: String(order.quantity) });
    if (!res || !res.order) {
      await sbPatch("orders?id=eq." + order.id, { provider_status: "Pending" });
      return { placed: false, reason: "panel: " + JSON.stringify(res).slice(0, 120) };
    }
    await sbPatch("orders?id=eq." + order.id,
      { provider_order_id: String(res.order), provider_status: "Pending",
        status: "processing" });
    return { placed: true, provider_order_id: String(res.order), service: t.service };
  } catch (e) {
    await sbPatch("orders?id=eq." + order.id, { provider_status: "Pending" });
    return { placed: false, reason: e.rate ? "panel 429 — will retry" : String(e).slice(0, 120) };
  }
}

async function syncStatuses() {
  if (!PANEL_ENABLED) return 0;
  const rows = await sbGet("orders?status=eq.processing&provider_order_id=not.is.null" +
    "&select=id,order_code,provider_order_id,provider_status&limit=6");
  let updated = 0;
  for (const o of rows) {
    try {
      const res = await panel({ action: "status", order: String(o.provider_order_id) });
      const ps = res && res.status;
      if (ps && ps !== o.provider_status) {
        const fields = { provider_status: ps };
        if (MIRROR[ps]) fields.status = MIRROR[ps];
        await sbPatch("orders?id=eq." + o.id, fields);
        updated++;
      }
    } catch (e) { if (e.rate) break; }
    await sleep(800);
  }
  return updated;
}


// ---------------- WhatsApp (Meta Cloud API) ----------------
// Token lives ONLY as a Vercel env var on Raji's account (WHATSAPP_TOKEN).
const WA_PHONE_ID = process.env.WHATSAPP_PHONE_ID || "1351878108014876";
const WA_ADMIN_NUMBER = "971562654855"; // Raji's personal number (alerts)
const GRAPH = "https://graph.facebook.com/v22.0";

function waPhone(raw) {
  let n = String(raw || "").replace(/[^0-9]/g, "");
  if (n.startsWith("0")) n = "92" + n.slice(1);
  else if (n.length === 10 && n.startsWith("3")) n = "92" + n;
  return n;
}
function waName(order) {
  let n = String(order.customer_name || "").split(" (Username:")[0].trim();
  return n || "Customer";
}
const SVC_LABEL = { followers: "Followers", likes: "Likes", views: "Views",
  comments: "Comments", subscribers: "Subscribers", pagelikes: "Page Likes",
  pagelikesfol: "Page Followers", watchtime: "Watch Time" };
function waService(order) {
  const plat = String(order.platform || "");
  const cap = plat.charAt(0).toUpperCase() + plat.slice(1);
  return cap + " " + (SVC_LABEL[order.service_type] || order.service_type || "");
}
async function waSend(to, template, params) {
  if (!process.env.WHATSAPP_TOKEN) return { sent: false, reason: "no token" };
  const payload = { messaging_product: "whatsapp", to, type: "template",
    template: { name: template, language: { code: "en" },
      components: params && params.length
        ? [{ type: "body", parameters: params.map((t) => ({ type: "text", text: String(t) })) }]
        : [] } };
  const r = await fetch(GRAPH + "/" + WA_PHONE_ID + "/messages", {
    method: "POST",
    headers: { Authorization: "Bearer " + process.env.WHATSAPP_TOKEN,
               "Content-Type": "application/json" },
    body: JSON.stringify(payload) });
  const data = await r.json().catch(() => ({}));
  return { sent: r.ok, status: r.status, data };
}
// Claim a one-time notification flag; true only for the caller that wins.
async function waClaim(orderId, column) {
  const body = {}; body[column] = new Date().toISOString();
  const rows = await sbPatch("orders?id=eq." + orderId + "&" + column + "=is.null", body);
  return rows.length > 0;
}
async function waUnclaim(orderId, column) {
  const body = {}; body[column] = null;
  await sbPatch("orders?id=eq." + orderId, body).catch(() => {});
}

module.exports = async (req, res) => {
  if (req.method !== "POST") { res.status(405).json({ error: "POST only" }); return; }
  if (!process.env.TRIGGER_KEY || req.headers["x-trigger-key"] !== process.env.TRIGGER_KEY) {
    res.status(401).json({ error: "unauthorized" }); return;
  }
  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  body = body || {};
  try {
    if (body.op === "place" && body.order_id) {
      const rows = await sbGet("orders?id=eq." + body.order_id + "&select=*&limit=1");
      const out = await placeOrder(rows[0]);
      res.status(200).json(out); return;
    }
    if (body.op === "sync") {
      const waiting = await sbGet("orders?status=eq.paid&provider_order_id=is.null&select=*&limit=3");
      const placed = [];
      for (const o of waiting) { placed.push(await placeOrder(o)); await sleep(800); }
      const synced = await syncStatuses();
      res.status(200).json({ placed, status_updates: synced }); return;
    }
    if (body.op === "notify_new_order" && body.order_id) {
      const rows = await sbGet("orders?id=eq." + body.order_id + "&select=*&limit=1");
      const o = rows[0];
      if (!o) { res.status(200).json({ sent: false, reason: "no order" }); return; }
      if (!(await waClaim(o.id, "wa_alert_sent_at"))) {
        res.status(200).json({ sent: false, reason: "already alerted" }); return;
      }
      const out = await waSend(WA_ADMIN_NUMBER, "new_order_alert",
        [o.order_code, waService(o), o.quantity, "Rs " + Number(o.price_pkr || 0).toLocaleString("en-US")]);
      if (!out.sent) await waUnclaim(o.id, "wa_alert_sent_at");
      res.status(200).json(out); return;
    }
    if (body.op === "wa_event" && body.order_id && body.event) {
      const rows = await sbGet("orders?id=eq." + body.order_id + "&select=*&limit=1");
      const o = rows[0];
      if (!o) { res.status(200).json({ sent: false, reason: "no order" }); return; }
      const to = waPhone(o.contact_number);
      let out = { sent: false, reason: "event ignored" };
      if (body.event === "paid") {
        if (await waClaim(o.id, "wa_paid_sent_at")) {
          out = await waSend(to, "order_received_payment_confirmed",
            [waName(o), o.order_code, waService(o)]);
          if (!out.sent) await waUnclaim(o.id, "wa_paid_sent_at");
        } else out = { sent: false, reason: "already sent" };
      } else if (body.event === "cancelled" && !o.provider_order_id) {
        if (await waClaim(o.id, "wa_rejected_sent_at")) {
          out = await waSend(to, "order_received_payment_rejected",
            [waName(o), o.order_code]);
          if (!out.sent) await waUnclaim(o.id, "wa_rejected_sent_at");
        } else out = { sent: false, reason: "already sent" };
      } else if (body.event === "completed") {
        if (await waClaim(o.id, "wa_completed_sent_at")) {
          out = await waSend(to, "order_completed", [o.order_code]);
          if (!out.sent) await waUnclaim(o.id, "wa_completed_sent_at");
        } else out = { sent: false, reason: "already sent" };
      }
      res.status(200).json(out); return;
    }
    res.status(400).json({ error: "unknown op" });
  } catch (e) {
    res.status(200).json({ ok: false, error: String(e).slice(0, 160) });
  }
};
