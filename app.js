/* BoostKaro storefront logic — all 43 quality services embedded */
(function () {
  "use strict";

  // ---- Config (anon key is public by design; RLS policies guard the tables) ----
  var SUPABASE_URL = "https://jixdvkssgqitqjucjiob.supabase.co";
  var SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppeGR2a3NzZ3FpdHFqdWNqaW9iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5Njk5NjYsImV4cCI6MjEwNzU0NTk2Nn0._UkyTqLweinByQpoyqXxhv-BIgciRhw59PY6sS8fb2E";
  var PKR_RATE = 292; // approximate

  var sb = null;
  try {
    sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch (e) {
    console.error("Supabase init failed:", e);
  }

  // ---- Service catalog ----
  // Tier: { p: price USD, u: unit ("k"=per 1000, "kh"=per 1000 hours, "pkg"=per package, "ch"=per channel), cpn: legacy coupon flag (unused), s: specs }
  var UNIT_LABEL = { k: "per 1,000", kh: "per 1,000 hours", pkg: "per package", ch: "per channel" };
  var UNIT_SHORT = { k: "/1k", kh: "/1k hrs", pkg: "/pkg", ch: "/channel" };

  var CATALOG = [
    { id: "instagram", label: "Instagram", categories: [
      { id: "followers", label: "Followers", subcats: [
        { id: "droppable", label: "Droppable", tiers: [
          { p: 2.6002, u: "k", cpn: true, s: "Max 100K, Real Accounts, Most With Posts and Profiles, All Flag Types Working, Speed 50K/Day, Drop Unknown, No Refill, Fast Start (Delay Possible)" }
        ]},
        { id: "nodrop", label: "No Drop", tiers: [
          { p: 4.225, u: "k", cpn: true, s: "Max 1M, Real Accounts, Old Accounts With Posts and Stories, Speed Up to 20K/Day, Drop Rate: None So Far, Refill 365 Days, Start Time 0-1 Hours, Turn Off Flag for Review Before Ordering" }
        ]},
        { id: "highquality", label: "High Quality", tiers: [
          { p: 5, u: "k", cpn: true, s: "Max 10M, 100% Old Accounts, High Quality Profiles, Non Drop, Speed 15K/Day, Guarantee 365 Days, Cancel and Refill Button Active, Start Time 0-15 Minutes, Turn Off Flag for Review Before Ordering" }
        ]}
      ]},
      { id: "likes", label: "Likes", subcats: [
        { id: "droppable", label: "Droppable", tiers: [
          { p: 0.2998, u: "k", cpn: true, s: "Max 1M, Real Accounts, All With Posts and Profiles, Speed 50K-100K/Day, Drop 0%, Refill 30 Days, Fast Start" }
        ]},
        { id: "nodrop", label: "No Drop", tiers: [
          { p: 0.4004, u: "k", cpn: true, s: "Max 1M, Old Accounts, All With Posts and Profiles, Speed 150K-200K/Day, Drop 0-5%, No Refill, Fast Start" }
        ]},
        { id: "highquality", label: "High Quality", tiers: [
          { p: 2.0871, u: "k", cpn: false, s: "Max 1M, Old Accounts, Most With Posts and Profiles, Speed 100K-150K/Day, Drop 0-5%, Refill 365 Days, Fast Start" }
        ]}
      ]},
      { id: "views", label: "Views", subcats: [
        { id: "droppable", label: "Droppable", tiers: [
          { p: 0.1, u: "k", cpn: true, s: "Max 100M, Speed 100K/Day, No Guarantee, Start Time 0-15 Minutes" }
        ]},
        { id: "nodrop", label: "No Drop", tiers: [
          { p: 0.2, u: "k", cpn: true, s: "Max 1000M, VIP Video Views, All Videos, No-Drop, Instant Start 0-15 Minutes, Speed 50M/Day, avg 17 Hours 34 Minutes" }
        ]},
        { id: "highquality", label: "High Quality", tiers: [
          { p: 0.3, u: "k", cpn: true, s: "Max 100M, All Links (Video + Reel + IGTV), Best Quality, Speed 1M/Day, Start 0-15 Minutes" }
        ]}
      ]},
      { id: "comments", label: "Comments", subcats: [
        { id: "nodrop", label: "No Drop", tiers: [
          { p: 2.9976, u: "k", cpn: true, s: "Max 1M, Instagram Comments" }
        ]}
      ]}
    ]},
    { id: "tiktok", label: "TikTok", categories: [
      { id: "followers", label: "Followers", subcats: [
        { id: "droppable", label: "Droppable", tiers: [
          { p: 3.5007, u: "k", cpn: true, s: "Max 1M, High Quality Accounts, Drop 50% or More Possible, No Refill, Cancel Enabled, Instant Start, Speed 10K+/Day, avg 5 Hours 13 Minutes" }
        ]},
        { id: "nodrop", label: "No Drop", tiers: [
          { p: 3.9039, u: "k", cpn: false, s: "Max 5M, High Quality Accounts, 0% Drop, No Refill, Cancel Enabled, Instant Start, Speed 10K+/Day, avg 17 Hours 48 Minutes" }
        ]},
        { id: "highquality", label: "High Quality", tiers: [
          { p: 7.0093, u: "k", cpn: false, s: "Max 100K, High Quality, 100% Non Drop, Lifetime Guarantee, Speed 5K/Day, avg 12 Hours 15 Minutes" }
        ]}
      ]},
      { id: "likes", label: "Likes", subcats: [
        { id: "droppable", label: "Droppable", tiers: [
          { p: 1.5, u: "k", cpn: true, s: "Max 50K, No Drop, No Refill, Cancel Enabled, Instant Start, Speed 50K/Day" }
        ]},
        { id: "nodrop", label: "No Drop", tiers: [
          { p: 2.5, u: "k", cpn: true, s: "Max 50K, No Drop, Refill 30 Days, Cancel Enabled, Instant Start, Speed 50K/Day, avg 4 Hours 14 Minutes" }
        ]},
        { id: "highquality", label: "High Quality", tiers: [
          { p: 4.16, u: "k", cpn: false, s: "Max 50K, No Drop, Refill Lifetime, Cancel Enabled, Instant Start, Speed 50K/Day, avg 4 Hours 17 Minutes" }
        ]}
      ]},
      { id: "views", label: "Views", subcats: [
        { id: "droppable", label: "Droppable", tiers: [
          { p: 0.1, u: "k", cpn: true, s: "Max 1000M, Fast Video Views" }
        ]},
        { id: "nodrop", label: "No Drop", tiers: [
          { p: 0.2, u: "k", cpn: true, s: "Max 1000M, Min 500, Non Drop, High Quality, Speed 10M/Day, Lifetime Guarantee, Cancel Enabled, Super Fast, Start Time 0-5 Minutes, avg 4 Hours 18 Minutes" }
        ]},
        { id: "highquality", label: "High Quality", tiers: [
          { p: 0.3, u: "k", cpn: true, s: "Max 500M, Confirmed Non Drop, Stable, High Quality + Real, Speed 10M/Day, Lifetime Guarantee, Start Time 0-15 Minutes" }
        ]}
      ]},
      { id: "comments", label: "Comments", subcats: [
        { id: "droppable", label: "Droppable", tiers: [
          { p: 2.5, u: "k", cpn: true, s: "Max 1K, TikTok Comments 3 Comments Post Related Emojis Text 100% Real Humans Top Accounts, No Refill, avg 3 Hours 47 Minutes" }
        ]},
        { id: "nodrop", label: "No Drop", tiers: [
          { p: 6, u: "k", cpn: true, s: "Max 1K, Non Drop, High Quality, Slow Speed 100+/Day, No Refill, avg 5 Hours 42 Minutes" }
        ]},
        { id: "highquality", label: "High Quality", tiers: [
          { p: 8, u: "k", cpn: false, s: "Max 10K, TikTok Video Comments, 100% Real Users, Speed 1K/Day, Lifetime Guaranteed, Start 0-1 Minute, avg 57 Hours 42 Minutes" }
        ]}
      ]}
    ]},
    { id: "facebook", label: "Facebook", categories: [
      { id: "pagelikesfol", label: "Page Likes + Followers", subcats: [
        { id: "droppable", label: "Droppable", tiers: [
          { p: 1, u: "k", cpn: true, s: "Max 500K, Facebook Followers, Old Accounts, High Quality, Speed 100K/Day, No Guarantee, Cancel Enabled, Start Time 0-15 Minutes" }
        ]},
        { id: "nodrop", label: "No Drop", tiers: [
          { p: 1.5, u: "k", cpn: true, s: "Max 500K, All Links, Non Drop, Speed 50K/Day, Guarantee 30 Days, Start 0-15 Minutes, avg 32 Hours 38 Minutes" }
        ]},
        { id: "highquality", label: "High Quality", tiers: [
          { p: 3, u: "k", cpn: true, s: "Max 100K, Page/Profile Followers, 100% Non Drop, Speed 50K-100K/Day, Lifetime Guarantee, Refill 365 Days, Start 0-12 Hours" }
        ]}
      ]},
      { id: "profilefol", label: "Profile / Page Followers", subcats: [
        { id: "droppable", label: "Droppable", tiers: [
          { p: 1, u: "k", cpn: true, s: "Max 500K, Facebook Followers, Old Accounts, High Quality, Speed 100K/Day, No Guarantee, Cancel Enabled, Start Time 0-15 Minutes" }
        ]},
        { id: "nodrop", label: "No Drop", tiers: [
          { p: 1.5, u: "k", cpn: true, s: "Max 500K, All Links, Non Drop, Speed 2K-5K/Day, Guarantee 30 Days, Start 0-15 Minutes" }
        ]},
        { id: "highquality", label: "High Quality", tiers: [
          { p: 3, u: "k", cpn: true, s: "Max 500K, 100% Real Users, Non Drop, Speed 5K/Day, Lifetime Guarantee, Start 0-24 Hours" }
        ]}
      ]},
      { id: "pagelikes", label: "Page Likes", subcats: [
        { id: "droppable", label: "Droppable", tiers: [
          { p: 0.8, u: "k", cpn: true, s: "Max 5M, Facebook Post Likes, Old Accounts, High Quality, Speed 100K/Day, No Guarantee, Cancel Enabled, Start Time 0-15 Minutes" }
        ]},
        { id: "nodrop", label: "No Drop", tiers: [
          { p: 1, u: "k", cpn: true, s: "Max 5M, Facebook Post Likes, Old Accounts, High Quality, Speed 100K/Day, No Guarantee, Cancel Enabled, Start Time 0-15 Minutes" }
        ]},
        { id: "highquality", label: "High Quality", tiers: [
          { p: 1.5, u: "k", cpn: true, s: "Max 5M, Facebook Post Likes, Old Accounts, High Quality, Speed 100K/Day, No Guarantee, Cancel Enabled, Start Time 0-15 Minutes" }
        ]}
      ]},
      { id: "comments", label: "Comments", subcats: [
        { id: "nodrop", label: "No Drop", tiers: [
          { p: 6, u: "k", cpn: true, s: "Max 100K, Facebook Custom Comments Drop- No Speed 100/Day Start Time 0-1 Hours, No Refill, avg 7 Hours 39 Minutes" }
        ]}
      ]},
      { id: "videoviews", label: "Video Views", subcats: [
        { id: "droppable", label: "Droppable", tiers: [
          { p: 0.4, u: "k", cpn: true, s: "Max Unlimited, Facebook Video/Reels Views, 1M/Day, Instant Start, 30 Days Refill, avg 4 Hours 17 Minutes" }
        ]},
        { id: "nodrop", label: "No Drop", tiers: [
          { p: 0.8, u: "k", cpn: true, s: "Max Unlimited, Non Drop, Lifetime Refill, Instant Start, avg 13 Hours 15 Minutes" }
        ]},
        { id: "highquality", label: "High Quality", tiers: [
          { p: 1.5, u: "k", cpn: true, s: "Max 500M, HQ VIP SERVER, Non Drop, 1M/Day, Lifetime Refill, avg 3 Hours 6 Minutes" }
        ]}
      ]}
    ]},
    { id: "youtube", label: "YouTube", categories: [
      { id: "subscribers", label: "Subscribers", subcats: [
        { id: "droppable", label: "Droppable", tiers: [
          { p: 12, u: "k", cpn: true, s: "Max 10K, Youtube Bot Subscribers Fast All Drop, Instantly Start, No Refill, avg 3 Hours 50 Minutes" }
        ]},
        { id: "nodrop", label: "No Drop", tiers: [
          { p: 30, u: "k", cpn: false, s: "Max 500, NonDrop, Speed 50+ / DAY, Start Time 0-12 Hours, Lifetime Refill, avg 25 Hours 28 Minutes" }
        ]}
      ]},
      { id: "views", label: "Views", subcats: [
        { id: "droppable", label: "Droppable", tiers: [
          { p: 2.5, u: "k", cpn: false, s: "Max 20K, YouTube Video Views Promotion, 100% Real Users, Ranking Views, Good for Channel Ranking, Drop Possible, No Refill, avg 17 Hours 46 Minutes" }
        ]},
        { id: "nodrop", label: "No Drop", tiers: [
          { p: 3.5, u: "k", cpn: true, s: "Max 100M, Lifetime 1K -5k/ day NON DROP, Start Time 0-60 Minutes, avg 34 Hours 57 Minutes" }
        ]},
        { id: "highquality", label: "High Quality", tiers: [
          { p: 5.5, u: "k", cpn: true, s: "Max 9M, YouTube Views Organic, Speed 1K-2K/Day, Monetizable, 100% Active Human, Lifetime, avg 44 Hours 7 Minutes" }
        ]}
      ]},
      { id: "likes", label: "Likes", subcats: [
        { id: "droppable", label: "Droppable", tiers: [
          { p: 1.5, u: "k", cpn: true, s: "Max 10K, Instant Start, Zero Drop, Refill 30 Days" }
        ]},
        { id: "nodrop", label: "No Drop", tiers: [
          { p: 3, u: "k", cpn: true, s: "Max 100K, Instant Start, Zero Drop, Refill 360 Days" }
        ]},
        { id: "highquality", label: "High Quality", tiers: [
          { p: 6, u: "k", cpn: true, s: "Max 100K, Instant Start, Zero Drop, Refill 360 Days" }
        ]}
      ]}
    ]}
  ];
  // ---- State ----
  var activePlatform = "instagram";
  var activeCategory = null;
  var activeSubcat = null;
  var orderTier = null; // {platform, category, subcat, tier}

  // ---- Helpers ----
  function $(id) { return document.getElementById(id); }
  function fmtUSD(n) { return "$" + Number(n).toFixed(2); }
  function fmtPKR(n) { return "Rs " + Math.round(Number(n)).toLocaleString("en-US"); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function getPlatform() {
    for (var i = 0; i < CATALOG.length; i++) if (CATALOG[i].id === activePlatform) return CATALOG[i];
    return CATALOG[0];
  }
  function getCategory() {
    var p = getPlatform();
    for (var i = 0; i < p.categories.length; i++) if (p.categories[i].id === activeCategory) return p.categories[i];
    return p.categories[0];
  }
  function getSubcat() {
    var c = getCategory();
    for (var i = 0; i < c.subcats.length; i++) if (c.subcats[i].id === activeSubcat) return c.subcats[i];
    return c.subcats[0];
  }
  function ensureSelection() {
    var p = getPlatform();
    if (!activeCategory || !p.categories.some(function (c) { return c.id === activeCategory; })) {
      activeCategory = p.categories[0].id;
    }
    var c = getCategory();
    if (!activeSubcat || !c.subcats.some(function (s) { return s.id === activeSubcat; })) {
      activeSubcat = c.subcats[0].id;
    }
  }

  function tierName(subcatLabel, tier) {
    return subcatLabel + " — " + fmtUSD(tier.p) + UNIT_SHORT[tier.u];
  }
  function qtyLabelFor(unit) {
    if (unit === "pkg") return "Number of packages";
    if (unit === "ch") return "Number of channels";
    if (unit === "kh") return "Watch hours";
    return "Quantity";
  }
  function qtyMinFor(unit) { return (unit === "pkg" || unit === "ch") ? 1 : 100; }
  function qtyDefaultFor(unit) { return (unit === "pkg" || unit === "ch") ? 1 : 1000; }
  // Finite ceiling for tiers the provider labels "Max Unlimited": the
  // provider's own maximum, 2^31 - 1 = 2,147,483,647. A real number (not
  // Infinity) so the quantity input's max attribute and the submit-time
  // block both work with it. Safe: quantities are read with parseInt and
  // compared as JS doubles — exact far beyond this value (below 2^53).
  var PROVIDER_UNLIMITED_MAX = 2147483647;

  // Per-tier maximum overrides, keyed by the tier's EXACT spec text so an
  // override can only ever match that one tier; consulted by qtyMaxFor()
  // before parsing. The spec text is customer display text and is NOT
  // edited.
  // - YouTube Views / No Drop: its spec text rounds the cap up to
  //   "Max 100M" (= 100,000,000), but the provider's true maximum for
  //   that service is 99,999,999 — enforce the provider's number.
  var QTY_MAX_OVERRIDES = {
    "Max 100M, Lifetime 1K -5k/ day NON DROP, Start Time 0-60 Minutes, avg 34 Hours 57 Minutes": 99999999
  };

  // Per-tier maximum, parsed from the tier's own spec text ("Max 10K",
  // "Max 500", "Max Unlimited", ...) — the same text shown to customers
  // in the service description, so the enforced cap can never drift from
  // the displayed one. Returns Infinity when a tier has no cap.
  function qtyMaxFor(tier) {
    if (!tier || !tier.s) return Infinity;
    if (Object.prototype.hasOwnProperty.call(QTY_MAX_OVERRIDES, tier.s)) return QTY_MAX_OVERRIDES[tier.s];
    var m = /Max\s+(Unlimited|[0-9]+(?:\.[0-9]+)?\s*[KM]?)/i.exec(tier.s);
    if (!m) return Infinity;
    var raw = m[1].replace(/\s+/g, "");
    if (/^unlimited$/i.test(raw)) return PROVIDER_UNLIMITED_MAX;
    var mult = 1;
    if (/K$/i.test(raw)) mult = 1000;
    else if (/M$/i.test(raw)) mult = 1000000;
    var v = parseFloat(raw) * mult;
    return isNaN(v) ? Infinity : v;
  }
  function calcTotalUSD(tier, qty) {
    if (tier.u === "k" || tier.u === "kh") return tier.p * qty / 1000;
    return tier.p * qty;
  }

  // ---- Converter ----
  function initConverter() {
    var usdInput = $("conv-usd"), pkrOut = $("conv-pkr");
    function update() {
      var v = parseFloat(usdInput.value);
      if (isNaN(v) || v < 0) v = 0;
      pkrOut.textContent = fmtPKR(v * PKR_RATE);
    }
    usdInput.addEventListener("input", update);
    update();
  }

  // ---- Selection state (the hero order card is the only ordering UI) ----


  function renderAll() {
    ensureSelection();
    syncHeroPills();
  }

  // ---- Payment methods (Step 1 selector) ----
  // The customer selects their payment app; the pay-box then shows that
  // app's number and TID note, the TID is validated against that app's
  // format, and the choice is recorded on the order's admin_note.
  var PAY_METHODS = {
    easypaisa: { label: "Easypaisa", number: "0334 8139464", tidNote: "Your Easypaisa TID is 11 digits — keep it from your receipt for Step 2." },
    jazzcash: { label: "JazzCash", number: "0334 0942542", tidNote: "Your JazzCash TID is 12 digits — keep it from your receipt for Step 2." },
    nayapay: { label: "NayaPay", number: "0334 8139464", tidNote: "Your NayaPay TID is the long code on your receipt — keep it for Step 2." }
  };
  function selectedPayMethod() {
    var sel = $("order-paymethod");
    var v = sel ? sel.value : "easypaisa";
    return PAY_METHODS[v] ? v : "easypaisa";
  }
  function updatePayMethod() {
    var m = PAY_METHODS[selectedPayMethod()];
    var numEl = $("pay-number");
    if (numEl) numEl.textContent = m.label + ": " + m.number;
    var noteEl = $("pay-tid-note");
    if (noteEl) noteEl.textContent = m.tidNote;
  }

  // ---- Order modal ----
  function openOrder(sel) {
    orderTier = sel;
    var t = sel.tier;
    $("order-title").textContent = "Order: " + sel.platform.label.replace(/^[📸🎵▶️📘📦]\s*/, "") + " " + sel.category.label;
    $("order-service-line").textContent = sel.subcat.label + " · " + fmtUSD(t.p) + " " + UNIT_LABEL[t.u] + (t.s ? " · " + t.s : "");
    var qty = $("order-qty");
    qty.min = qtyMinFor(t.u);
    var maxQ = qtyMaxFor(t);
    qty.max = isFinite(maxQ) ? maxQ : "";
    qty.value = qtyDefaultFor(t.u);
    document.querySelector('label[for="order-qty"]').innerHTML = esc(qtyLabelFor(t.u)) + ' <span class="req">*</span>';
    $("order-qty-hint").textContent = "Min " + qtyMinFor(t.u).toLocaleString() + (t.u === "k" || t.u === "kh" ? " units" : "") +
      (isFinite(maxQ) ? " · Max " + maxQ.toLocaleString("en-US") + (t.u === "k" || t.u === "kh" ? " units" : "") : "");
    $("order-name").value = "";
    $("order-phone").value = "";
    $("order-link").value = "";
    $("order-username").value = "";
    $("order-tid").value = "";
    var pmSel = $("order-paymethod");
    if (pmSel) pmSel.value = "easypaisa";
    updatePayMethod();
    $("order-coupon").value = "";
    $("coupon-msg").textContent = "";
    couponDiscount = 0;
    couponCodeApplied = "";
    $("order-error").innerHTML = "";
    updateOrderTotal();
    $("order-modal").classList.add("open");
    // GA4: checkout_start (fires once per modal open)
    if (typeof gtag === "function") {
      gtag("event", "checkout_start", {
        service: sel.platform.label + " " + sel.category.label,
        tier: sel.subcat.label,
        price_usd: sel.tier.p
      });
    }
  }

  var couponDiscount = 0; // 0.1 = 10% off
  var couponCodeApplied = ""; // code that produced couponDiscount ("" = none)

  // FIRST30 is a private ONE-TIME code: 30% off Instagram Followers only.
  // Single use is enforced against past orders: a redeemed order carries
  // "FIRST30" in its admin_note, so any later apply/submit is refused.
  // Privacy fix: the orders table is no longer publicly readable, so the
  // one-time check goes through the first30_used() function instead of a
  // direct SELECT on admin_note. Failure semantics unchanged: any error
  // means "treat as unusable".
  function checkFirst30Used() {
    if (!sb) return Promise.resolve(true); // cannot verify -> treat as unusable
    return sb.rpc("first30_used")
      .then(function (res) { return res.error ? true : !!res.data; })
      .catch(function () { return true; });
  }

  function calcTotal() {
    if (!orderTier) return { usd: 0, pkr: 0, qty: 0 };
    var qty = parseInt($("order-qty").value, 10);
    if (isNaN(qty)) qty = 0;
    var usd = calcTotalUSD(orderTier.tier, qty);
    usd = usd * (1 - couponDiscount);
    return { usd: usd, pkr: usd * PKR_RATE, qty: qty };
  }

  function updateOrderTotal() {
    var t = calcTotal();
    $("order-total-usd").textContent = fmtUSD(t.usd);
    $("order-total-pkr").textContent = fmtPKR(t.pkr);
    $("pay-pkr").textContent = fmtPKR(t.pkr);
  }

  function applyCoupon() {
    var code = $("order-coupon").value.trim().toUpperCase();
    var msg = $("coupon-msg");
    if (code === "FIRST30") {
      // Private one-time code: 30% off Instagram Followers, single use only.
      couponDiscount = 0;
      couponCodeApplied = "";
      if (!orderTier || orderTier.platform.id !== "instagram" || orderTier.category.id !== "followers") {
        msg.textContent = "Coupon not valid on this service.";
        msg.style.color = "var(--danger)";
        updateOrderTotal();
        return;
      }
      msg.textContent = "Checking code…";
      msg.style.color = "";
      checkFirst30Used().then(function (used) {
        if ($("order-coupon").value.trim().toUpperCase() !== "FIRST30") return;
        if (used) {
          couponDiscount = 0;
          couponCodeApplied = "";
          msg.textContent = "This one-time code has already been used.";
          msg.style.color = "var(--danger)";
        } else {
          couponDiscount = 0.3;
          couponCodeApplied = "FIRST30";
          msg.textContent = "✅ 30% OFF applied!";
          msg.style.color = "var(--accent-dark)";
        }
        updateOrderTotal();
      });
      return;
    } else if (code === "") {
      couponDiscount = 0;
      couponCodeApplied = "";
      msg.textContent = "";
    } else {
      couponDiscount = 0;
      couponCodeApplied = "";
      msg.textContent = "❌ Invalid coupon code.";
      msg.style.color = "var(--danger)";
    }
    updateOrderTotal();
  }

  function genOrderCode() {
    var chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    var c = "";
    for (var i = 0; i < 6; i++) c += chars.charAt(Math.floor(Math.random() * chars.length));
    return "BK-" + c;
  }

  // Sequential public order codes starting at BK-0503: BK-0503, BK-0504, ...
  // Privacy fix: the next code is computed server-side by the
  // next_order_code() function (the orders table is no longer publicly
  // readable). It applies the same rule as before: 503 + (count of
  // existing BK-<digits> codes). Existing random codes (BK-XXXXXX) are
  // untouched. Any lookup failure falls back to the random generator so
  // checkout never breaks.
  function genSequentialOrderCode() {
    if (!sb) return Promise.resolve(genOrderCode());
    return sb.rpc("next_order_code")
      .then(function (res) {
        if (res.error || !res.data) return genOrderCode();
        return String(res.data);
      })
      .catch(function () { return genOrderCode(); });
  }

  function showError(msg, errCat) {
    $("order-error").innerHTML = '<div class="alert error">' + esc(msg) + "</div>";
    // GA4: checkout_validation_error (Group B1, 2026-10-25). Only a fixed
    // category code, the selected payment app and the service/tier are
    // sent - never the message text, TID, phone, link or any other
    // personal or order data.
    if (errCat && typeof gtag === "function") {
      var info = { error_category: errCat, payment_method: selectedPayMethod() };
      if (orderTier) {
        info.service = orderTier.platform.id + " " + orderTier.category.id;
        info.tier = orderTier.subcat.label;
      }
      gtag("event", "checkout_validation_error", info);
    }
  }

  function unitWord(u) {
    if (u === "pkg") return "package(s)";
    if (u === "ch") return "channel(s)";
    if (u === "kh") return "hours";
    return "units";
  }

  function submitOrder() {
    if (!sb) { showError("Database not connected. Please try again later.", "db_unavailable"); return; }
    if (!orderTier) return;
    var t = calcTotal();
    var tier = orderTier.tier;
    var name = $("order-name").value.trim();
    var phone = $("order-phone").value.trim();
    var link = $("order-link").value.trim();
    var username = $("order-username").value.trim().replace(/^@+/, "");
    var tid = $("order-tid").value.trim();
    var minQ = qtyMinFor(tier.u);

    if (!t.qty || t.qty < minQ) {
      showError("Quantity must be at least " + minQ + " " + unitWord(tier.u) + ".", "quantity_min");
      return;
    }
    // Max-quantity enforcement (the bridge re-validates against the live
    // provider range as a second layer, unchanged).
    var maxQ = qtyMaxFor(tier);
    if (isFinite(maxQ) && t.qty > maxQ) {
      showError("Maximum quantity for this service is " + maxQ.toLocaleString("en-US") + " " + unitWord(tier.u) + ".", "quantity_max");
      return;
    }
    if (!phone) { showError("Contact number is required — we need it in case your link is wrong.", "contact_missing"); return; }
    if (!link || !/^https?:\/\//i.test(link)) { showError("Please enter a valid profile/post link starting with http.", "link_invalid"); return; }
    if (!tid) { showError("Please enter your JazzCash/Easypaisa/NayaPay transaction ID (TID).", "tid_empty"); return; }
    // TID format check (Group A2, 2026-10-25; NayaPay + payment-app
    // selector added 2026-10-25). The TID is checked against the app the
    // customer selected in Step 1. Formats verified from real paid
    // orders + provider statements: Easypaisa 11 digits, JazzCash 12
    // digits, NayaPay a 24-character code (letters + numbers) or a
    // TMICFBPK reference followed by 18 digits (owner's samples). A
    // leading "#" is part of the TID as copied from the receipt app, so
    // it is accepted as entered — the value itself is never rewritten.
    // An 11-digit number starting "03" is a mobile number, not a TID.
    var payMethod = selectedPayMethod();
    var tidDigits = tid.replace(/^#/, "");
    var tidIsNumeric = /^\d+$/.test(tidDigits);
    if (payMethod === "nayapay") {
      var tidIsNayaPay = /^[0-9a-fA-F]{24}$/.test(tid) || /^TMICFBPK\d{18}$/.test(tid);
      if (!tidIsNayaPay) {
        if (tidIsNumeric && (tidDigits.length === 11 || tidDigits.length === 12)) { showError("That looks like an Easypaisa/JazzCash TID. If you paid with that app, select it in Step 1 — or paste the NayaPay code from your receipt.", "tid_wrong_app"); return; }
        showError("That NayaPay TID doesn't look right — it is the long code on your NayaPay receipt. Please copy it exactly.", "tid_nayapay_format"); return;
      }
    } else if (!tidIsNumeric) {
      showError("Your TID should be numbers only — please copy the transaction ID from your " + PAY_METHODS[payMethod].label + " receipt.", "tid_not_numeric"); return;
    } else if (tidDigits.length === 11 && tidDigits.indexOf("03") === 0) {
      showError("That looks like a phone number, not a TID. Please enter the transaction ID from your payment receipt.", "tid_phone_number"); return;
    } else if (payMethod === "easypaisa" && tidDigits.length !== 11) {
      if (tidDigits.length === 12) { showError("That looks like a JazzCash TID (12 digits). If you paid with JazzCash, select JazzCash in Step 1 — Easypaisa TIDs are 11 digits.", "tid_wrong_app"); return; }
      showError("That TID doesn't look right — Easypaisa TIDs are 11 digits. Please check the transaction ID on your receipt.", "tid_wrong_length"); return;
    } else if (payMethod === "jazzcash" && tidDigits.length !== 12) {
      if (tidDigits.length === 11) { showError("That looks like an Easypaisa TID (11 digits). If you paid with Easypaisa, select Easypaisa in Step 1 — JazzCash TIDs are 12 digits.", "tid_wrong_app"); return; }
      showError("That TID doesn't look right — JazzCash TIDs are 12 digits. Please check the transaction ID on your receipt.", "tid_wrong_length"); return;
    }

    var btn = $("order-submit");
    btn.disabled = true;
    btn.textContent = "Submitting…";

    var code = null; // resolved by genSequentialOrderCode() just before insert
    // The orders table has no username column — appending an unknown column
    // would break the insert. The optional username rides along in
    // customer_name (displayed in the admin panel) so checkout never breaks.
    var custName = name;
    if (username) custName = (custName ? custName + " " : "") + "(Username: @" + username + ")";
    var payload = {
      order_code: code,
      service_id: null,
      platform: orderTier.platform.id,
      service_type: orderTier.category.id,
      quality: orderTier.subcat.label + " " + fmtUSD(tier.p) + UNIT_SHORT[tier.u],
      quantity: t.qty,
      price_usd: Math.round(t.usd * 100) / 100,
      price_pkr: Math.round(t.pkr),
      customer_name: custName || null,
      contact_number: phone,
      profile_link: link,
      transaction_id: tid,
      status: "pending"
    };
    // Record a redeemed FIRST30 on the order's admin_note — that record is
    // what makes the code one-time (checkFirst30Used reads it back). The
    // payment app the customer selected rides along in the same note, so
    // the payment can be verified in the right account.
    var noteParts = [];
    if (couponCodeApplied === "FIRST30") noteParts.push("Coupon FIRST30 (-30%)");
    noteParts.push("Paid via " + PAY_METHODS[selectedPayMethod()].label);
    payload.admin_note = noteParts.join(" · ");

    function done(ok, errMsg) {
      btn.disabled = false;
      btn.textContent = "Submit Order";
      if (!ok) { showError(errMsg || "Could not submit order. Please try again.", "submit_failed"); return; }
      // GA4: order_submitted (only on successful submission, no PII)
      if (typeof gtag === "function") {
        gtag("event", "order_submitted", {
          service: orderTier.platform.id + " " + orderTier.category.id,
          tier: orderTier.subcat.label,
          price_usd: Math.round(t.usd * 100) / 100,
          quantity: t.qty
        });
      }
      $("order-modal").classList.remove("open");
      $("confirm-code").textContent = code;
      var trackLink = $("confirm-track-link");
      if (trackLink) trackLink.href = "/track?code=" + encodeURIComponent(code);
      $("confirm-detail").textContent = tierName(orderTier.subcat.label, tier) + " × " + t.qty.toLocaleString() +
        " — " + fmtUSD(t.usd) + " (≈ " + fmtPKR(t.pkr) + ")";
      $("confirm-modal").classList.add("open");
    }

    // Resolve the next sequential code (BK-0503, BK-0504, ...) first,
    // then insert. genSequentialOrderCode() itself falls back to the
    // random generator if the lookup fails, so this chain always runs.
    function proceed() {
      genSequentialOrderCode().then(function (seqCode) {
        code = seqCode;
        payload.order_code = code;
        return sb.from("orders").insert(payload);
      }).then(function (res) {
        if (res.error) {
          if (res.error.code === "23505") {
            payload.order_code = genOrderCode();
            code = payload.order_code;
            return sb.from("orders").insert(payload).then(function (res2) {
              done(!res2.error, res2.error && res2.error.message);
            });
          }
          done(false, res.error.message);
        } else {
          done(true);
        }
      }).catch(function (e) {
        done(false, e && e.message);
      });
    }

    // One-time guard: re-verify FIRST30 is still unused right before the
    // order is written, so the same code can never be redeemed twice.
    if (couponCodeApplied === "FIRST30") {
      checkFirst30Used().then(function (used) {
        if (used) {
          btn.disabled = false;
          btn.textContent = "Submit Order";
          showError("The FIRST30 code has already been used.", "coupon_first30_used");
          return;
        }
        proceed();
      });
    } else {
      proceed();
    }
  }

  // ---- Order tracking lives on the dedicated /track page (new design) ----

  // ---- Page view tracking (for traffic reports) ----
  function trackPageView() {
    if (!sb) return;
    try {
      sb.from("page_views").insert({
        page: "/",
        referrer: document.referrer || null,
        user_agent: navigator.userAgent.substring(0, 200)
      }).then(function () {});
    } catch (e) {}
  }

  // ---- Deep link support (from SEO landing pages) ----
  // URL format: ?platform=instagram&category=followers&subcat=nodrop
  // Sets the hero order card's platform / category / service and scrolls
  // to it (#order). Bad or missing params fall back to hero defaults.
  function initDeepLink() {
    try {
      var params = new URLSearchParams(window.location.search);
      var platform = params.get("platform");
      if (!platform) return;

      var p = null;
      for (var i = 0; i < CATALOG.length; i++) {
        if (CATALOG[i].id === platform) { p = CATALOG[i]; break; }
      }
      if (!p) return;

      heroPlatform = platform;
      activePlatform = platform;
      activeCategory = null;
      activeSubcat = null;
      var pills = document.querySelectorAll(".hero-pill");
      for (var n = 0; n < pills.length; n++) {
        pills[n].classList.toggle("on", pills[n].getAttribute("data-platform") === platform);
      }
      populateHeroCategories();

      var category = params.get("category");
      var c = null;
      if (category) {
        for (var j = 0; j < p.categories.length; j++) {
          if (p.categories[j].id === category) { c = p.categories[j]; break; }
        }
      }
      if (c) {
        activeCategory = c.id;
        var catSel = $("hero-category");
        if (catSel) {
          catSel.value = c.id;
          populateHeroServices();
        }
        var subcat = params.get("subcat");
        var sel = $("hero-service");
        if (subcat && sel) {
          var ok = false;
          for (var k = 0; k < c.subcats.length; k++) {
            if (c.subcats[k].id === subcat) { ok = true; break; }
          }
          if (ok) {
            sel.value = subcat;
            activeSubcat = subcat;
            syncHeroQty();
            updateHeroPrice();
            updateHeroDesc();
          }
        }
      }

      var ord = $("order");
      if (ord && ord.scrollIntoView) ord.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (e) {}
  }


  // ---- Hero order card (the only ordering UI) ----
  // The hero card uses cascading steps,
  // Pakistan-Panels style: its platform pills set activePlatform; its
  // Category select lists the platform's categories; its Service select
  // lists only the chosen category's qualities (subcats) with "from"
  // prices; its button opens the checkout (order modal) directly for
  // the selected platform + category + quality, quantity carried over.
  var heroPlatform = "instagram";

  function cheapestTier(sc) {
    return sc.tiers.slice().sort(function (a, b) { return a.p - b.p; })[0];
  }

  function heroPlatformObj() {
    for (var i = 0; i < CATALOG.length; i++) if (CATALOG[i].id === heroPlatform) return CATALOG[i];
    return CATALOG[0];
  }

  function heroSelection() {
    var catSel = $("hero-category");
    var sel = $("hero-service");
    if (!catSel || !sel || !catSel.value || !sel.value) return null;
    var p = heroPlatformObj();
    var c = null, sc = null;
    for (var j = 0; j < p.categories.length; j++) if (p.categories[j].id === catSel.value) c = p.categories[j];
    if (!c) return null;
    for (var k = 0; k < c.subcats.length; k++) if (c.subcats[k].id === sel.value) sc = c.subcats[k];
    if (!sc) return null;
    return { platform: p, category: c, subcat: sc };
  }

  function syncHeroQty() {
    var sel2 = heroSelection();
    var qty = $("hero-qty");
    if (!sel2 || !qty) return;
    var cheap = cheapestTier(sel2.subcat);
    if (!cheap) return;
    qty.min = qtyMinFor(cheap.u);
    qty.value = qtyDefaultFor(cheap.u);
  }

  function updateHeroPrice() {
    var sel2 = heroSelection();
    if (!sel2) return;
    var cheap = cheapestTier(sel2.subcat);
    if (!cheap) return;
    var qty = parseInt($("hero-qty").value, 10);
    if (isNaN(qty) || qty < 0) qty = 0;
    var usd = calcTotalUSD(cheap, qty);
    $("hero-price-usd").textContent = fmtUSD(usd);
    $("hero-price-pkr").textContent = "≈ " + fmtPKR(usd * PKR_RATE);
  }

  function updateHeroDesc() {
    var box = $("hero-desc");
    var txt = $("hero-desc-text");
    if (!box || !txt) return;
    var sel2 = heroSelection();
    var tier = sel2 ? cheapestTier(sel2.subcat) : null;
    if (tier && tier.s) {
      var catId = (sel2.category && sel2.category.id) || "";
      txt.textContent = tier.s + (catId.indexOf("follow") >= 0
        ? " \u2014 \u26A0\uFE0F Important: If your account has 0 followers, please order the minimum quantity first to build a base, then order your full quantity."
        : "");
      box.style.display = "";
    } else {
      txt.textContent = "";
      box.style.display = "none";
    }
  }

  function populateHeroCategories() {
    var catSel = $("hero-category");
    if (!catSel) { populateHeroServices(); return; }
    var p = heroPlatformObj();
    catSel.innerHTML = "";
    p.categories.forEach(function (c) {
      var opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.label;
      catSel.appendChild(opt);
    });
    // Default: the platform's first category (e.g. Followers)
    catSel.selectedIndex = 0;
    populateHeroServices();
  }

  function populateHeroServices() {
    var sel = $("hero-service");
    if (!sel) return;
    var p = heroPlatformObj();
    var catSel = $("hero-category");
    var c = null;
    for (var i = 0; i < p.categories.length; i++) {
      if (p.categories[i].id === (catSel && catSel.value)) c = p.categories[i];
    }
    if (!c) c = p.categories[0];
    sel.innerHTML = "";
    c.subcats.forEach(function (sc) {
      var cheap = cheapestTier(sc);
      var opt = document.createElement("option");
      opt.value = sc.id;
      opt.textContent = sc.label + (cheap ? " (from " + fmtUSD(cheap.p) + UNIT_SHORT[cheap.u] + ")" : "");
      sel.appendChild(opt);
    });
    // Preselect Instagram Followers — No Drop (hero default quality)
    if (heroPlatform === "instagram" && c.id === "followers") {
      for (var j = 0; j < sel.options.length; j++) {
        if (sel.options[j].value === "nodrop") { sel.selectedIndex = j; break; }
      }
    }
    syncHeroQty();
    updateHeroPrice();
    updateHeroDesc();
  }

  function syncHeroPills() {
    var pills = document.querySelectorAll(".hero-pill");
    for (var i = 0; i < pills.length; i++) {
      pills[i].classList.toggle("on", pills[i].getAttribute("data-platform") === activePlatform);
    }
    if (heroPlatform !== activePlatform) {
      heroPlatform = activePlatform;
      populateHeroCategories();
    }
  }

  function initHero() {
    var pills = document.querySelectorAll(".hero-pill");
    for (var i = 0; i < pills.length; i++) {
      pills[i].addEventListener("click", function () {
        heroPlatform = this.getAttribute("data-platform");
        // Mirror into the shared selection state
        activePlatform = heroPlatform;
        activeCategory = null;
        activeSubcat = null;
        populateHeroCategories();
        renderAll();
      });
    }
    var catSel = $("hero-category");
    if (catSel) catSel.addEventListener("change", function () { populateHeroServices(); });
    var sel = $("hero-service");
    if (sel) sel.addEventListener("change", function () { syncHeroQty(); updateHeroPrice(); updateHeroDesc(); });
    var qty = $("hero-qty");
    if (qty) qty.addEventListener("input", updateHeroPrice);
    var btn = $("hero-order-btn");
    if (btn) btn.addEventListener("click", function () {
      var sel2 = heroSelection();
      if (!sel2) return;
      var tier = cheapestTier(sel2.subcat);
      if (!tier) return;
      // One tap from selection to checkout: open the order modal directly
      // for the selected platform + category + quality.
      openOrder({ platform: sel2.platform, category: sel2.category, subcat: sel2.subcat, tier: tier });
      // Carry the hero quantity into the modal and recalculate its total.
      var heroQty = parseInt($("hero-qty").value, 10);
      var oq = $("order-qty");
      if (oq && !isNaN(heroQty)) {
        var min = parseInt(oq.min, 10);
        if (!isNaN(min) && heroQty < min) heroQty = min;
        oq.value = heroQty;
        updateOrderTotal();
      }
    });
    populateHeroCategories();
  }

  // ---- Init ----
  document.addEventListener("DOMContentLoaded", function () {
    initConverter();
    initHero();
    initDeepLink();
    var burger = $("burger"), mainNav = $("nav-main");
    if (burger && mainNav) burger.addEventListener("click", function () { mainNav.classList.toggle("open"); });
    $("order-qty").addEventListener("input", updateOrderTotal);
    $("coupon-apply").addEventListener("click", applyCoupon);
    $("order-coupon").addEventListener("input", function() {
      var v = this.value.trim().toUpperCase();
      if (v === "") { couponDiscount = 0; couponCodeApplied = ""; $("coupon-msg").textContent = ""; updateOrderTotal(); }
      else if (couponCodeApplied && v !== couponCodeApplied) { couponDiscount = 0; couponCodeApplied = ""; $("coupon-msg").textContent = ""; updateOrderTotal(); }
    });
    $("order-submit").addEventListener("click", submitOrder);
    var pmEl = $("order-paymethod");
    if (pmEl) {
      pmEl.addEventListener("change", function () {
        updatePayMethod();
        // GA4: payment_method_select (Group B3, 2026-10-25) - the app
        // name only; no personal or order data.
        if (typeof gtag === "function") gtag("event", "payment_method_select", { payment_method: selectedPayMethod() });
      });
      updatePayMethod();
    }
    $("modal-close").addEventListener("click", function () { $("order-modal").classList.remove("open"); });
    $("confirm-close").addEventListener("click", function () { $("confirm-modal").classList.remove("open"); });
    $("confirm-ok").addEventListener("click", function () { $("confirm-modal").classList.remove("open"); });
    $("order-modal").addEventListener("click", function (e) {
      if (e.target === this) this.classList.remove("open");
    });
    $("confirm-modal").addEventListener("click", function (e) {
      if (e.target === this) this.classList.remove("open");
    });
    renderAll();
    trackPageView();
  });



})();

// ---- Public reviews on homepage (real reviews only, 2026-10-24) ----
// NOTE: this block sits OUTSIDE the main IIFE, so it builds its own client.
function loadPublicReviews() {
  var grid = document.getElementById("rev-grid");
  if (!grid || !window.supabase) return;
  var client = window.supabase.createClient("https://jixdvkssgqitqjucjiob.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppeGR2a3NzZ3FpdHFqdWNqaW9iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5Njk5NjYsImV4cCI6MjEwNzU0NTk2Nn0._UkyTqLweinByQpoyqXxhv-BIgciRhw59PY6sS8fb2E");
  client.rpc("public_reviews").then(function (res) {
    if (res.error || !res.data) return;
    var rows = res.data;
    if (!rows.length) return;
    var total = rows.length, sum = 0, dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    rows.forEach(function (r) { var n = Number(r.rating) || 0; sum += n; if (dist[n] != null) dist[n]++; });
    var avg = sum / total;
    var avgEl = document.getElementById("rev-avg");
    if (avgEl) avgEl.textContent = avg.toFixed(1);
    var stEl = document.getElementById("rev-stars");
    if (stEl) stEl.textContent = "\u2605".repeat(Math.round(avg)) + "\u2606".repeat(5 - Math.round(avg));
    var cntEl = document.getElementById("rev-count");
    if (cntEl) cntEl.textContent = total + (total === 1 ? " real review" : " real reviews") + " from real orders";
    [5, 4, 3, 2, 1].forEach(function (n) {
      var bar = document.getElementById("rev-bar" + n);
      if (bar) bar.style.width = Math.round(dist[n] / total * 100) + "%";
    });
    grid.innerHTML = "";
    var SHOW_FIRST = 3;
    var shownRows = rows.slice(0, SHOW_FIRST);
    var moreBtn = null;
    if (rows.length > SHOW_FIRST) {
      moreBtn = document.createElement("button");
      moreBtn.type = "button";
      moreBtn.className = "btn btn-blue";
      moreBtn.style.cssText = "display:block;margin:14px auto 0;padding:8px 20px;font-size:.92rem";
      moreBtn.textContent = "See all reviews";
      var expanded = false;
      moreBtn.addEventListener("click", function () {
        expanded = !expanded;
        shownRows = expanded ? rows : rows.slice(0, SHOW_FIRST);
        moreBtn.textContent = expanded ? "Show less" : "See all reviews";
        paint();
      });
      grid.parentNode.appendChild(moreBtn);
    }
    function paint() {
    grid.innerHTML = "";
    shownRows.forEach(function (r) {
      var n = Number(r.rating) || 0;
      var d = new Date(r.created_at);
      var card = document.createElement("div");
      card.className = "rev";
      card.innerHTML = '<div class="rev-top"><div class="rev-id"><div class="ava"></div><div class="rev-nm"><span class="nm"></span><div class="dt"></div></div></div><span class="stars"></span></div><p></p>';
      card.querySelector(".ava").textContent = (String(r.customer_name || "?").trim().charAt(0) || "?").toUpperCase();
      card.querySelector(".nm").textContent = r.customer_name || "Customer";
      card.querySelector(".dt").textContent = new Date(r.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
      card.querySelector(".stars").textContent = "\u2605".repeat(n) + "\u2606".repeat(5 - n);
      card.querySelector("p").textContent = r.review_text || "";
      grid.appendChild(card);
    });
    }
    paint();
  }).catch(function () {});
}
document.addEventListener("DOMContentLoaded", function () { setTimeout(loadPublicReviews, 600); });
