// BoostKaro direct order flow — runs on Raji's own Vercel account.
// Called by his Supabase database:
//   - instantly, by a trigger, the moment an order is marked "paid"
//     ({op:"place", order_id}) -> places the order at GeoSMM
//   - every 15 minutes by pg_cron ({op:"sync"}) -> safety net: places any
//     paid order still waiting, and mirrors provider statuses back.
// Auth: header "x-trigger-key" must match the TRIGGER_KEY env var.
// Secrets live ONLY as Vercel env vars on Raji's account:
//   TRIGGER_KEY (shared with the database), PANEL_API_KEY (GeoSMM),
//   SUPABASE_SERVICE_KEY (his Supabase service_role key).
// Supplier history: PakistanPanels until 2026-10-25, GeoSMM from 2026-10-25.
const SB_URL = "https://jixdvkssgqitqjucjiob.supabase.co";
const SB_ANON_PUBLIC = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppeGR2a3NzZ3FpdHFqdWNqaW9iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5Njk5NjYsImV4cCI6MjEwNzU0NTk2Nn0._UkyTqLweinByQpoyqXxhv-BIgciRhw59PY6sS8fb2E"; // public anon key (also shipped in app.js)
const PANEL_URL = "https://geosmm.pk/api/v2";
// GeoSMM connected 2026-10-25 (PakistanPanels disconnected the same day).
// WhatsApp notifications (notify_new_order / wa_event) are independent of
// this flag.
const PANEL_ENABLED = true;
// PakistanPanels-era provider order IDs still attached to live orders.
// NEVER sync these against GeoSMM — the same numbers may exist there as
// other customers' orders. BK-0505 (1653140) and BK-0508 (1657765) are
// closed manually in admin.
const LEGACY_PROVIDER_IDS = { "1653140": true, "1657765": true };
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const PROVIDER_MAP = {
 "facebook/pagelikes/Droppable": 5765,
 "facebook/pagelikes/High Quality": 5765,
 "facebook/pagelikes/No Drop": 5765,
 "facebook/pagelikesfol/Droppable": 5766,
 "facebook/pagelikesfol/High Quality": 5776,
 "facebook/pagelikesfol/No Drop": 6939,
 "facebook/profilefol/Droppable": 5766,
 "facebook/profilefol/High Quality": 5778,
 "facebook/profilefol/No Drop": 6938,
 "instagram/comments/No Drop": 6964,
 "instagram/followers/Droppable": 7179,
 "instagram/followers/High Quality": 5790,
 "instagram/followers/No Drop": 5555,
 "instagram/likes/Droppable": 5081,
 "instagram/likes/High Quality": 5086,
 "instagram/likes/No Drop": 5085,
 "instagram/views/Droppable": 5792,
 "instagram/views/High Quality": 6897,
 "instagram/views/No Drop": 6901,
 "tiktok/comments/Droppable": 6943,
 "tiktok/followers/Droppable": 7063,
 "tiktok/followers/High Quality": 7032,
 "tiktok/followers/No Drop": 6889,
 "tiktok/likes/Droppable": 7189,
 "tiktok/likes/High Quality": 7191,
 "tiktok/likes/No Drop": 7190,
 "tiktok/views/Droppable": 5755,
 "tiktok/views/High Quality": 6954,
 "tiktok/views/No Drop": 6948,
 "youtube/likes/Droppable": 6987,
 "youtube/likes/High Quality": 6988,
 "youtube/likes/No Drop": 6988
};
// Tiers with NO GeoSMM entry (handled manually, orders stay "paid"):
// facebook/comments, facebook/videoviews (all), youtube/subscribers (all),
// youtube/views (all).
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
    if (LEGACY_PROVIDER_IDS[String(o.provider_order_id)]) continue;
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
// Record one automated WhatsApp send so Meta's delivery receipts
// (matched by wamid in api/whatsapp-webhook.js) can prove delivery.
// Best-effort only: a logging failure must never break the send flow,
// and the wa_messages table may not exist until Raji runs the one-time
// delivery-tracking SQL.
async function waLog(ctx, to, template, data) {
  try {
    const wamid = data && data.messages && data.messages[0] && data.messages[0].id;
    const h = sbHeaders(); h.Prefer = "resolution=ignore-duplicates,return=minimal";
    await fetch(SB_URL + "/rest/v1/wa_messages", {
      method: "POST", headers: h,
      body: JSON.stringify({ order_id: ctx && ctx.order_id || null,
        order_code: ctx && ctx.order_code || null,
        recipient: String(to), template: template,
        wamid: wamid || null, status: "accepted" }) });
  } catch (e) { /* tracking is best-effort */ }
}
async function waSend(to, template, params, ctx) {
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
  if (r.ok && ctx) await waLog(ctx, to, template, data);
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
        [o.order_code, waService(o), o.quantity, "Rs " + Number(o.price_pkr || 0).toLocaleString("en-US")],
        { order_id: o.id, order_code: o.order_code });
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
            [waName(o), o.order_code, waService(o)],
            { order_id: o.id, order_code: o.order_code });
          if (!out.sent) await waUnclaim(o.id, "wa_paid_sent_at");
        } else out = { sent: false, reason: "already sent" };
      } else if (body.event === "cancelled" && !o.provider_order_id) {
        if (await waClaim(o.id, "wa_rejected_sent_at")) {
          out = await waSend(to, "order_received_payment_rejected",
            [waName(o), o.order_code],
            { order_id: o.id, order_code: o.order_code });
          if (!out.sent) await waUnclaim(o.id, "wa_rejected_sent_at");
        } else out = { sent: false, reason: "already sent" };
      } else if (body.event === "completed") {
        if (await waClaim(o.id, "wa_completed_sent_at")) {
          out = await waSend(to, "order_completed", [o.order_code],
            { order_id: o.id, order_code: o.order_code });
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
