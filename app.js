/* BoostKaro storefront logic — all 150 real services embedded */
(function () {
  "use strict";

  // ---- Config (anon key is public by design; RLS policies guard the tables) ----
  var SUPABASE_URL = "https://jixdvkssgqitqjucjiob.supabase.co";
  var SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppeGR2a3NzZ3FpdHFqdWNqaW9iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5Njk5NjYsImV4cCI6MjEwNzU0NTk2Nn0._UkyTqLweinByQpoyqXxhv-BIgciRhw59PY6sS8fb2E";
  var PKR_RATE = 282.49; // approximate

  var sb = null;
  try {
    sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch (e) {
    console.error("Supabase init failed:", e);
  }

  // ---- Service catalog ----
  // Tier: { p: price USD, u: unit ("k"=per 1000, "kh"=per 1000 hours, "pkg"=per package, "ch"=per channel), s: specs }
  var UNIT_LABEL = { k: "per 1,000", kh: "per 1,000 hours", pkg: "per package", ch: "per channel" };
  var UNIT_SHORT = { k: "/1k", kh: "/1k hrs", pkg: "/pkg", ch: "/channel" };

  var CATALOG = [
    { id: "instagram", label: "Instagram", categories: [
      { id: "followers", label: "Followers", subcats: [
        { id: "drop20", label: "20% Drop", tiers: [
          { p: 2.8, u: "k", s: "Max 100M, 100K/day, old accounts only, no refill" },
          { p: 2.6, u: "k", s: "Max 50K, 10-20K/day" },
          { p: 3.35, u: "k", s: "Max 100K, 3-5K/day, good quality, no refill" },
          { p: 3.20, u: "k", s: "Max 100K, 30-50K/day, less drop possible, no refill" },
          { p: 5, u: "k", s: "Max 5M, 100-200K/day, no refill" },
          { p: 5.50, u: "k", s: "Max 100K, 10K/day, good quality, no refill" }
        ]},
        { id: "stable90", label: "90% Stable", tiers: [
          { p: 3.2, u: "k", s: "Max 1M, 100K/day" },
          { p: 3, u: "k", s: "Max 10M, 150-200K/day" },
          { p: 4.8, u: "k", s: "Max 100K, 30-50K/day, 30-day refill" },
          { p: 5, u: "k", s: "Max 1M, 50-100K/day, 30-day refill" },
          { p: 5.50, u: "k", s: "Max 50K, 15-25K/day, 30-day refill" },
          { p: 6, u: "k", s: "Max 100K, 30-50K/day, real accounts, less drop" },
          { p: 6.50, u: "k", s: "Max 10M, 5-10K/day, 30-day refill" },
          { p: 7.3, u: "k", s: "Max 100K, 1K/day, non-drop" },
          { p: 8, u: "k", s: "Max 10M, 100K/day, 30-day refill, real premium accounts" }
        ]},
        { id: "nondrop", label: "Non Drop", tiers: [
          { p: 9, u: "k", s: "Max 100K, 1K/day, non-drop, 30-day refill" }
        ]},
        { id: "specialusa", label: "Special USA", tiers: [
          { p: 7, u: "k", s: "Max 10K, non-drop, 30-day refill" }
        ]},
        { id: "realfol", label: "Real Followers", tiers: [
          { p: 5.0, u: "k", s: "Worldwide quality, no refill" }
        ]},
        { id: "brazilfol", label: "Brazilian Followers", tiers: [
          { p: 2, u: "k", s: "Max 50K, 10K/day, 55% Brazil, high quality, 10% drop, no refill" },
          { p: 2.50, u: "k", s: "Max 50K, 10K/day, 75% Brazil, high quality, 10% drop, no refill" },
          { p: 2.90, u: "k", s: "Max 50K, 10K/day" },
          { p: 3.25, u: "k", s: "Max 50K, 10K/day, 100% Brazil, high quality, 10% drop, no refill" },
          { p: 3, u: "k", s: "Max 50K, 10K/day, 100% Brazil, high quality, low drop, no refill" },
          { p: 4, u: "k", s: "Max 10K, 10-20K/day, high Brazil quality, 30-day refill" },
          { p: 8, u: "k", s: "Max 50K, 10K/day, 100% Brazil, high quality, low drop, 30-day auto refill" },
          { p: 9, u: "k", s: "Max 50K, 10K/day, 100% Brazil, high quality, low drop, 30-day refill" }
        ]}
      ]},
      { id: "likes", label: "Likes", subcats: [
        { id: "hq", label: "High Quality", tiers: [
          { p: 0.52, u: "k", s: "100K-200K/day, real + mixed quality, non-drop" },
          { p: 0.55, u: "k", s: "Max 20K, 10K-20K/day, non-drop, 90-day refill" },
          { p: 0.60, u: "k", s: "Max 100K, 3-5K/hour, no drop, 30-day refill" },
          { p: 0.70, u: "k", s: "Max 20K, 10K-20K/day, non-drop, 365-day refill" },
          { p: 0.85, u: "k", s: "50K-100K/day, likes + reach & impressions, non-drop, 30-day refill" },
          { p: 0.77, u: "k", s: "Max 100K, 10-20K/day, non-drop, 30-day refill" },
          { p: 0.80, u: "k", s: "Max 20K, 10K-20K/day, non-drop, 30-day refill" },
          { p: 1, u: "k", s: "Max 20K, 10K-20K/day, non-drop, 60-day refill" },
          { p: 1.50, u: "k", s: "Max unlimited, 30-50K/day, high speed, non-drop, 30-day refill" }
        ]},
        { id: "cheap", label: "Cheap Likes", tiers: [
          { p: 0.30, u: "k", s: "Max 500K, mixed quality, 10K/hour, instant" },
          { p: 0.40, u: "k", s: "Max 100K, 50K/hour, mixed quality, non-drop, instant" },
          { p: 0.50, u: "k", s: "Max 500K, 50K/hour, good quality, non-drop, instant" },
          { p: 0.85, u: "k", s: "Max 10K, 500-1K/hour, real HQ likes, non-drop" },
          { p: 1, u: "k", s: "Max 10K, 3-4K/hour" },
          { p: 2, u: "k", s: "Max 15K, 1K-2K/hour, real HQ likes, non-drop, instant" }
        ]},
        { id: "targeted", label: "Targeted Likes", tiers: [
          { p: 2, u: "k", s: "Turkey, Max 5K" },
          { p: 3, u: "k", s: "Indian, Max 5K, 200-300/day, non-drop" }
        ]}
      ]},
      { id: "views", label: "Views", subcats: [
        { id: "reelvideo", label: "Reels / Video Views", tiers: [
          { p: 0.10, u: "k", s: "Max 2M, all links (video + reel + IGTV), 2M/day" },
          { p: 0.10, u: "k", s: "Max unlimited, fastest speed, super cheap, instant" },
          { p: 0.10, u: "k", s: "Max 1M, 1-2M/day, non-drop, all links" },
          { p: 0.10, u: "k", s: "Max 100M, 50K/day, explore + access, instant" },
          { p: 0.12, u: "k", s: "Max 100M, all links, fast, instant" },
          { p: 0.14, u: "k", s: "Explore + access, fast" },
          { p: 0.14, u: "k", s: "Max 1M, 1-2M/day, non-drop, all links" },
          { p: 0.15, u: "k", s: "Max 100M, 100K/hour, non-drop, lifetime refill" },
          { p: 0.15, u: "k", s: "Fastest, cheapest" },
          { p: 0.20, u: "k", s: "Max 100M, 50K/day, explore + access views" },
          { p: 0.20, u: "k", s: "Max 10M, cheap, instant" },
          { p: 0.28, u: "k", s: "Max 10M, 1-2M/day, non-drop, emergency, instant" }
        ]}
      ]},
      { id: "comments", label: "Comments", subcats: [
        { id: "custom", label: "Custom Comments", tiers: [
          { p: 3, u: "k", s: "uHQ custom comments, super quality" },
          { p: 5, u: "k", s: "Max 10K, 1K/day, high quality, non-drop" },
          { p: 7, u: "k", s: "Max 1K, 100-200/day, less/non drop, 30-day refill" },
          { p: 7.60, u: "k", s: "Turkey custom comments, Max 5K" },
          { p: 8, u: "k", s: "Real custom comments" },
          { p: 11, u: "k", s: "Max 1K, super fast, instant" },
          { p: 16, u: "k", s: "Max 10K, 500-1K/day, 30-day refill" },
          { p: 23, u: "k", s: "Max 10K, 3K/day, high quality, non-drop, lifetime refill" }
        ]},
        { id: "random", label: "Random Comments", tiers: [
          { p: 3, u: "k", s: "Max 50K, random, real quality, non-drop, instant" },
          { p: 4, u: "k", s: "Max 2K, 100-200/day, 100% organic, non-drop" },
          { p: 5, u: "k", s: "Max 10K, 10K/day, non-drop, instant" },
          { p: 6, u: "k", s: "Max 10K, random, super fast, instant" },
          { p: 7, u: "k", s: "Max 10K, 3K/day, high quality, non-drop, lifetime refill" }
        ]}
      ]}
    ]},
    { id: "tiktok", label: "TikTok", categories: [
      { id: "followers", label: "Followers", subcats: [
        { id: "normal", label: "Normal Followers", tiers: [
          { p: 3.50, u: "k", s: "Max 50K, 500-1K/day, HQ + real, non-drop" },
          { p: 4, u: "k", s: "Max 1M, 50-100K/day, non-drop, 30-day refill" },
          { p: 4.50, u: "k", s: "Max 10K, 10K/day, high quality + real, 300-day guarantee" },
          { p: 5, u: "k", s: "Max 10K, 5K/day, high quality, non-drop, 30-day refill" },
          { p: 5.70, u: "k", s: "Max 500K, 20-40K/day, high quality, non-drop, 30-day refill, natural increase" },
          { p: 7, u: "k", s: "Max 100K, 3-5K/day, no drop, 365-day refill" },
          { p: 8, u: "k", s: "Max 1M, 30-50K/day, high quality, non-drop, 30-day refill, high speed" },
          { p: 10, u: "k", s: "Max 500K, 3-5K/day, high quality, no drop" },
          { p: 13, u: "k", s: "5-10K/day, high quality, 30-day refill" },
          { p: 14, u: "k", s: "Max 100K, 5K-10K/day, high quality + real" }
        ]},
        { id: "targeted", label: "Targeted Followers", tiers: [
          { p: 8, u: "k", s: "Brazil" }
        ]}
      ]},
      { id: "likes", label: "Likes", subcats: [
        { id: "pakistan", label: "Pakistan Likes", tiers: [
          { p: 2, u: "k", s: "10K/day" }
        ]},
        { id: "brazil", label: "Brazil Likes", tiers: [
          { p: 2, u: "k", s: "Max 100K, 50K/day" }
        ]}
      ]},
      { id: "views", label: "Views", subcats: [
        { id: "normal", label: "Normal Views", tiers: [
          { p: 0.10, u: "k", s: "Max 1M, 100K/day, lifetime guaranteed" },
          { p: 0.15, u: "k", s: "Real and natural views, 500K/day" },
          { p: 0.2, u: "k", s: "Max 1M, 1M/day, less/non drop, instant" },
          { p: 0.23, u: "k", s: "Max 10M, 1M/day, ultra fast" },
          { p: 0.14, u: "k", s: "Max 1M, 500K/day, ultrafast" },
          { p: 0.20, u: "k", s: "Max 10M, 1M/day, non-drop, cheapest, instant" },
          { p: 2, u: "k", s: "Real non drop views" }
        ]},
        { id: "country", label: "Country Targeted", tiers: [
          { p: 1.50, u: "k", s: "All countries available — Turkey, Pakistan, Afghanistan, Albania, Algeria, Argentina, Australia, Austria, Azerbaijan, Bahrain, Bangladesh, Belgium, Brazil, Bulgaria, Canada, Chile, China, Colombia, Croatia, Cyprus, Denmark, and many more" }
        ]}
      ]},
      { id: "comments", label: "Comments", subcats: [
        { id: "pakistan", label: "Pakistan Targeted", tiers: [
          { p: 5, u: "k", s: "Pakistan targeted comments" }
        ]},
        { id: "normal", label: "Normal Comments", tiers: [
          { p: 5.00, u: "k", s: "Custom comments" },
          { p: 4.50, u: "k", s: "Emoji comments" },
          { p: 6, u: "k", s: "" },
          { p: 9, u: "k", s: "Non drop" },
          { p: 10, u: "k", s: "" }
        ]}
      ]}
    ]},
    { id: "facebook", label: "Facebook", categories: [
      { id: "pagelikesfol", label: "Page Likes + Followers", subcats: [
        { id: "oldpages", label: "Old Pages", tiers: [
          { p: 0.60, u: "k", s: "" },
          { p: 1, u: "k", s: "" },
          { p: 2, u: "k", s: "" },
          { p: 3.50, u: "k", s: "" },
          { p: 4, u: "k", s: "" },
          { p: 8, u: "k", s: "" }
        ]},
        { id: "newpages", label: "New Pages", tiers: [
          { p: 3, u: "k", s: "" },
          { p: 4, u: "k", s: "" },
          { p: 5, u: "k", s: "" }
        ]}
      ]},
      { id: "profilefol", label: "Profile / Page Followers", subcats: [
        { id: "normal", label: "Normal Followers", tiers: [
          { p: 1, u: "k", s: "" },
          { p: 1.20, u: "k", s: "" },
          { p: 1.50, u: "k", s: "" },
          { p: 2, u: "k", s: "" },
          { p: 2.50, u: "k", s: "" },
          { p: 3, u: "k", s: "" },
          { p: 4.50, u: "k", s: "" }
        ]}
      ]},
      { id: "pagelikes", label: "Page Likes", subcats: [
        { id: "normal", label: "Normal Likes", tiers: [
          { p: 0.80, u: "k", s: "" },
          { p: 1, u: "k", s: "" },
          { p: 1.50, u: "k", s: "" }
        ]}
      ]},
      { id: "comments", label: "Comments", subcats: [
        { id: "random", label: "Random", tiers: [
          { p: 7, u: "k", s: "" },
          { p: 7.30, u: "k", s: "" }
        ]},
        { id: "custom", label: "Custom", tiers: [
          { p: 19, u: "k", s: "" },
          { p: 23, u: "k", s: "" },
          { p: 27, u: "k", s: "" },
          { p: 35, u: "k", s: "" }
        ]}
      ]},
      { id: "videoviews", label: "Video Views", subcats: [
        { id: "normal", label: "Normal Views", tiers: [
          { p: 0.30, u: "k", s: "" },
          { p: 0.40, u: "k", s: "" },
          { p: 0.90, u: "k", s: "" },
          { p: 2.50, u: "k", s: "" },
          { p: 5, u: "k", s: "" }
        ]},
        { id: "live", label: "Live Stream Views", tiers: [
          { p: 3.30, u: "k", s: "⏱ 30 minutes live stream" },
          { p: 4.59, u: "k", s: "⏱ 60 minutes live stream" },
          { p: 5.89, u: "k", s: "⏱ 90 minutes live stream" },
          { p: 6.97, u: "k", s: "⏱ 120 minutes live stream" },
          { p: 8.21, u: "k", s: "⏱ 150 minutes live stream" },
          { p: 14, u: "k", s: "⏱ 180 minutes live stream" }
        ]}
      ]}
    ]},
    { id: "youtube", label: "YouTube", categories: [
      { id: "subscribers", label: "Subscribers", subcats: [
        { id: "normal", label: "Normal Subscribers", tiers: [
          { p: 35, u: "k", s: "Normal sub" },
          { p: 55, u: "k", s: "Fast sub" }
        ]}
      ]},
      { id: "views", label: "Views", subcats: [
        { id: "real", label: "Real Views", tiers: [
          { p: 3, u: "k", s: "Real views" }
        ]}
      ]},
      { id: "watchtime", label: "Watch Time", subcats: [
        { id: "min60", label: "60 Min Video", tiers: [
          { p: 40, u: "kh", s: "Watch hours for 60-minute videos" }
        ]}
      ]},
      { id: "likes", label: "Likes", subcats: [
        { id: "normal", label: "Normal Likes", tiers: [
          { p: 1, u: "k", s: "" },
          { p: 1.50, u: "k", s: "" },
          { p: 3, u: "k", s: "" },
          { p: 5, u: "k", s: "" },
          { p: 7, u: "k", s: "" }
        ]}
      ]},
      { id: "channels", label: "Channels", subcats: [
        { id: "monetized", label: "Monetized Channels", tiers: [
          { p: 160, u: "ch", s: "Fully monetized YouTube channel" }
        ]}
      ]}
    ]},
    { id: "packages", label: "Packages", categories: [
      { id: "growth", label: "Growth Packages", subcats: [
        { id: "packs", label: "Packages", tiers: [
          { p: 65, u: "pkg", s: "Instagram - SK — Real Active 50 Followers + Likes + Comments, 30 days" },
          { p: 70, u: "pkg", s: "Instagram - BR — Real Active 50 Followers + Likes + Comments, 30 days" },
          { p: 75, u: "pkg", s: "Instagram - Real Active 50 Followers + Likes + Comments, 30 days" },
          { p: 80, u: "pkg", s: "Instagram - Arab — Real Active 50 Followers + Likes + Comments, 30 days" },
          { p: 87, u: "pkg", s: "Instagram - USA — Real Active 50 Followers + Likes + Comments, 30 days" },
          { p: 100, u: "pkg", s: "Instagram - Real Active 100 Followers + Likes + Comments, 30 days" },
          { p: 109, u: "pkg", s: "Instagram - Arab — Real Active 100 Followers + Likes + Comments, 30 days" },
          { p: 120, u: "pkg", s: "Instagram - USA — Real Active 100 Followers + Likes + Comments, 30 days" },
          { p: 159, u: "pkg", s: "Instagram - Real Active 200 Followers + Likes + Comments, 30 days" }
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

  // ---- Drill-down navigation (Platform → Service → Quality → Prices) ----
  // step: 0=platforms, 1=categories, 2=subcats(qualities), 3=tiers(prices)
  var drillStep = 0;

  var PLATFORM_LOGOS = {
    instagram: "data:image/webp;base64,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",
    tiktok: "data:image/webp;base64,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",
    youtube: "data:image/webp;base64,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",
    facebook: "data:image/webp;base64,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",
    packages: "data:image/webp;base64,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"
  };

  function platformName(p) {
    return p.label.replace(/^[📸🎵▶️📘📦]\s*/, "");
  }

  function drillTitle() {
    var t = $("services-title");
    if (drillStep === 0) t.textContent = "Choose a Platform";
    else if (drillStep === 1) t.textContent = getPlatform().label.replace(/^[📸🎵▶️📘📦]\s*/, "") + " — Choose a Service";
    else if (drillStep === 2) t.textContent = getCategory().label + " — Choose Quality";
    else t.textContent = getSubcat().label + " — Prices";
  }

  function renderCrumbs() {
    var wrap = $("crumbs");
    if (drillStep === 0) { wrap.style.display = "none"; wrap.innerHTML = ""; return; }
    wrap.style.display = "";
    wrap.innerHTML = "";
    var items = [];
    items.push({ label: "← Platforms", step: 0 });
    if (drillStep >= 1) items.push({ label: getPlatform().label, step: 0 });
    if (drillStep >= 2) items.push({ label: getCategory().label, step: 1 });
    if (drillStep >= 3) items.push({ label: getSubcat().label, step: 2 });
    items.forEach(function (it, i) {
      if (i > 0) {
        var sep = document.createElement("span");
        sep.className = "crumb-sep";
        sep.textContent = "›";
        wrap.appendChild(sep);
      }
      var b = document.createElement("button");
      b.type = "button";
      b.className = "crumb-btn" + (i === 0 ? " back" : "");
      b.textContent = it.label;
      b.addEventListener("click", function () { goToStep(it.step); });
      wrap.appendChild(b);
    });
  }

  function goToStep(step) {
    drillStep = step;
    if (step === 0) { activeCategory = null; activeSubcat = null; }
    if (step === 1) { activeSubcat = null; }
    renderAll();
    var sec = $("services");
    if (sec && sec.scrollIntoView) sec.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function makePlatformCard(p, count, onClick) {
    var card = document.createElement("button");
    card.type = "button";
    card.className = "platform-card";
    var logo = PLATFORM_LOGOS[p.id];
    card.innerHTML =
      (logo ? '<img class="platform-logo" src="' + esc(logo) + '" alt="' + esc(platformName(p)) + '">' : "") +
      '<span class="platform-name">' + esc(platformName(p)) + "</span>" +
      '<span class="platform-count">' + esc(count + " services") + "</span>";
    card.addEventListener("click", onClick);
    return card;
  }

  function makeChoiceCard(label, sub, onClick) {
    var card = document.createElement("button");
    card.type = "button";
    card.className = "choice-card";
    card.innerHTML = '<span class="choice-label">' + esc(label) + "</span>" +
      (sub ? '<span class="choice-sub">' + esc(sub) + "</span>" : "") +
      '<span class="choice-arrow">›</span>';
    card.addEventListener("click", onClick);
    return card;
  }

  function renderChoices() {
    var grid = $("choice-grid");
    var tierWrap = $("tier-grid");
    grid.innerHTML = "";
    grid.style.display = "";
    tierWrap.style.display = "none";
    tierWrap.innerHTML = "";
    // Platforms use grid layout, services/qualities use single-column list
    grid.classList.toggle("list-mode", drillStep !== 0);
    var note = $("services-note");

    if (drillStep === 0) {
      CATALOG.forEach(function (p) {
        var count = 0;
        p.categories.forEach(function (c) { c.subcats.forEach(function (s) { count += s.tiers.length; }); });
        grid.appendChild(makePlatformCard(p, count, function () {
          activePlatform = p.id; activeCategory = null; activeSubcat = null;
          drillStep = 1; renderAll();
        }));
      });
      if (note) note.textContent = "Tap a platform to see its services.";
    } else if (drillStep === 1) {
      var p = getPlatform();
      p.categories.forEach(function (c) {
        var n = 0;
        c.subcats.forEach(function (s) { n += s.tiers.length; });
        grid.appendChild(makeChoiceCard(c.label, n + " options", function () {
          activeCategory = c.id; activeSubcat = null;
          var cc = getCategory();
          if (cc.subcats.length === 1) {
            activeSubcat = cc.subcats[0].id;
            drillStep = 3;
          } else {
            drillStep = 2;
          }
          renderAll();
        }));
      });
      if (note) note.textContent = "Choose what you want to boost.";
    } else if (drillStep === 2) {
      var c = getCategory();
      c.subcats.forEach(function (s) {
        var cheapest = s.tiers.slice().sort(function (a, b) { return a.p - b.p; })[0];
        grid.appendChild(makeChoiceCard(s.label,
          cheapest ? ("from " + fmtUSD(cheapest.p) + " " + UNIT_SHORT[cheapest.u]) : "",
          function () {
            activeSubcat = s.id;
            drillStep = 3; renderAll();
          }));
      });
      if (note) note.textContent = "Pick a quality tier to see prices.";
    }
  }

  function renderTiers() {
    var grid = $("tier-grid");
    var choiceWrap = $("choice-grid");
    choiceWrap.style.display = "none";
    choiceWrap.innerHTML = "";
    grid.style.display = "";
    grid.innerHTML = "";
    var p = getPlatform(), c = getCategory(), sc = getSubcat();
    var tiers = sc.tiers.slice().sort(function (a, b) { return a.p - b.p; });
    var note = $("services-note");
    if (note && tiers.length) {
      note.textContent = "Prices " + UNIT_LABEL[tiers[0].u] + " · ≈ Rs 282.49 per USD. Cheapest first — pick a tier to order.";
    }
    if (!tiers.length) {
      grid.innerHTML = '<p class="muted">No services found for this selection.</p>';
      return;
    }
    tiers.forEach(function (t, idx) {
      var card = document.createElement("div");
      card.className = "tier-card" + (idx === 0 ? " cheapest" : "");
      card.innerHTML =
        (idx === 0 ? '<span class="tier-badge">Cheapest</span>' : "") +
        "<h3>" + esc(tierName(sc.label, t)) + "</h3>" +
        (t.s ? '<p class="desc">' + esc(t.s) + "</p>" : "") +
        '<div class="price">' + fmtUSD(t.p) + " <small>" + UNIT_LABEL[t.u] + " · ≈ " + fmtPKR(t.p * PKR_RATE) + "</small></div>";
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn block";
      btn.textContent = "Order Now";
      btn.addEventListener("click", function () {
        openOrder({ platform: p, category: c, subcat: sc, tier: t });
      });
      card.appendChild(btn);
      grid.appendChild(card);
    });
  }

  function renderAll() {
    ensureSelection();
    drillTitle();
    renderCrumbs();
    if (drillStep === 3) renderTiers();
    else renderChoices();
  }

  // ---- Order modal ----
  function openOrder(sel) {
    orderTier = sel;
    var t = sel.tier;
    $("order-title").textContent = "Order: " + sel.platform.label.replace(/^[📸🎵▶️📘📦]\s*/, "") + " " + sel.category.label;
    $("order-service-line").textContent = sel.subcat.label + " · " + fmtUSD(t.p) + " " + UNIT_LABEL[t.u] + (t.s ? " · " + t.s : "");
    var qty = $("order-qty");
    qty.min = qtyMinFor(t.u);
    qty.value = qtyDefaultFor(t.u);
    document.querySelector('label[for="order-qty"]').innerHTML = esc(qtyLabelFor(t.u)) + ' <span class="req">*</span>';
    $("order-qty-hint").textContent = "Min " + qtyMinFor(t.u).toLocaleString() + (t.u === "k" || t.u === "kh" ? " units" : "");
    $("order-name").value = "";
    $("order-phone").value = "";
    $("order-link").value = "";
    $("order-tid").value = "";
    $("order-coupon").value = "";
    $("coupon-msg").textContent = "";
    couponDiscount = 0;
    $("order-error").innerHTML = "";
    updateOrderTotal();
    $("order-modal").classList.add("open");
  }

  var couponDiscount = 0; // 0.3 = 30% off

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
      // Not valid on Packages
      if (activePlatform === "packages") {
        couponDiscount = 0;
        msg.textContent = "❌ FIRST30 is not valid on Packages.";
        msg.style.color = "var(--danger)";
      } else {
        couponDiscount = 0.3;
        msg.textContent = "✅ 30% OFF applied!";
        msg.style.color = "var(--accent-dark)";
      }
    } else if (code === "") {
      couponDiscount = 0;
      msg.textContent = "";
    } else {
      couponDiscount = 0;
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

  function showError(msg) {
    $("order-error").innerHTML = '<div class="alert error">' + esc(msg) + "</div>";
  }

  function unitWord(u) {
    if (u === "pkg") return "package(s)";
    if (u === "ch") return "channel(s)";
    if (u === "kh") return "hours";
    return "units";
  }

  function submitOrder() {
    if (!sb) { showError("Database not connected. Please try again later."); return; }
    if (!orderTier) return;
    var t = calcTotal();
    var tier = orderTier.tier;
    var name = $("order-name").value.trim();
    var phone = $("order-phone").value.trim();
    var link = $("order-link").value.trim();
    var tid = $("order-tid").value.trim();
    var minQ = qtyMinFor(tier.u);

    if (!t.qty || t.qty < minQ) {
      showError("Quantity must be at least " + minQ + " " + unitWord(tier.u) + ".");
      return;
    }
    if (!phone) { showError("Contact number is required — we need it in case your link is wrong."); return; }
    if (!link || !/^https?:\/\//i.test(link)) { showError("Please enter a valid profile/post link starting with http."); return; }
    if (!tid) { showError("Please enter your JazzCash/Easypaisa transaction ID (TID)."); return; }

    var btn = $("order-submit");
    btn.disabled = true;
    btn.textContent = "Submitting…";

    var code = genOrderCode();
    var payload = {
      order_code: code,
      service_id: null,
      platform: orderTier.platform.id,
      service_type: orderTier.category.id,
      quality: orderTier.subcat.label + " " + fmtUSD(tier.p) + UNIT_SHORT[tier.u],
      quantity: t.qty,
      price_usd: Math.round(t.usd * 100) / 100,
      price_pkr: Math.round(t.pkr),
      customer_name: name || null,
      contact_number: phone,
      profile_link: link,
      transaction_id: tid,
      status: "pending"
    };

    function done(ok, errMsg) {
      btn.disabled = false;
      btn.textContent = "Submit Order";
      if (!ok) { showError(errMsg || "Could not submit order. Please try again."); return; }
      $("order-modal").classList.remove("open");
      $("confirm-code").textContent = code;
      $("confirm-detail").textContent = tierName(orderTier.subcat.label, tier) + " × " + t.qty.toLocaleString() +
        " — " + fmtUSD(t.usd) + " (≈ " + fmtPKR(t.pkr) + ")";
      $("confirm-modal").classList.add("open");
    }

    sb.from("orders").insert(payload).then(function (res) {
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

  // ---- Track order ----
  function trackOrder() {
    var out = $("track-result");
    var code = $("track-code").value.trim().toUpperCase();
    var phone = $("track-phone").value.trim();
    if (!code || !phone) {
      out.innerHTML = '<div class="alert error">Enter both your order code and contact number.</div>';
      return;
    }
    if (!sb) {
      out.innerHTML = '<div class="alert error">Database not connected. Please try again later.</div>';
      return;
    }
    out.innerHTML = '<p class="muted">Looking up your order…</p>';
    sb.from("orders").select("*").eq("order_code", code).eq("contact_number", phone).limit(1)
      .then(function (res) {
        if (res.error) {
          out.innerHTML = '<div class="alert error">Lookup failed: ' + esc(res.error.message) + "</div>";
          return;
        }
        if (!res.data || !res.data.length) {
          out.innerHTML = '<div class="alert error">No order found. Check your code and contact number.</div>';
          return;
        }
        var o = res.data[0];
        var d = new Date(o.created_at);
        out.innerHTML =
          '<div class="track-result">' +
          '<span class="status ' + esc(o.status) + '">' + esc(o.status) + "</span>" +
          "<dl>" +
          "<dt>Order</dt><dd>" + esc(o.order_code) + "</dd>" +
          "<dt>Service</dt><dd>" + esc(o.platform) + " · " + esc(o.service_type) + " · " + esc(o.quality) + "</dd>" +
          "<dt>Quantity</dt><dd>" + Number(o.quantity).toLocaleString() + "</dd>" +
          "<dt>Paid</dt><dd>" + fmtUSD(o.price_usd) + " (≈ " + fmtPKR(o.price_pkr) + ")</dd>" +
          "<dt>Placed</dt><dd>" + esc(d.toLocaleString()) + "</dd>" +
          (o.admin_note ? "<dt>Note</dt><dd>" + esc(o.admin_note) + "</dd>" : "") +
          "</dl></div>";
      })
      .catch(function () {
        out.innerHTML = '<div class="alert error">Lookup failed. Please try again.</div>';
      });
  }

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
  // URL format: ?platform=instagram&category=followers&subcat=stable90&tier=1
  // tier = index in the subcategory's original tiers array
  function initDeepLink() {
    try {
      var params = new URLSearchParams(window.location.search);
      var platform = params.get("platform");
      var category = params.get("category");
      var subcat = params.get("subcat");
      var tierIdx = params.get("tier");
      if (!platform || !category) return;

      // Validate platform exists
      var p = null;
      for (var i = 0; i < CATALOG.length; i++) {
        if (CATALOG[i].id === platform) { p = CATALOG[i]; break; }
      }
      if (!p) return;

      // Validate category exists
      var c = null;
      for (var j = 0; j < p.categories.length; j++) {
        if (p.categories[j].id === category) { c = p.categories[j]; break; }
      }
      if (!c) return;

      activePlatform = platform;
      activeCategory = category;

      if (subcat) {
        var sc = null;
        for (var k = 0; k < c.subcats.length; k++) {
          if (c.subcats[k].id === subcat) { sc = c.subcats[k]; break; }
        }
        if (sc) {
          activeSubcat = subcat;
          drillStep = 3;
          renderAll();
          // If tier specified, open order modal for exact tier
          if (tierIdx !== null) {
            var idx = parseInt(tierIdx, 10);
            if (!isNaN(idx) && idx >= 0 && idx < sc.tiers.length) {
              openOrder({ platform: p, category: c, subcat: sc, tier: sc.tiers[idx] });
            }
          }
          return;
        }
      }
      // Category only: go to subcategory selection
      drillStep = (c.subcats.length === 1) ? 3 : 2;
      if (drillStep === 3 && c.subcats.length === 1) {
        activeSubcat = c.subcats[0].id;
      }
      renderAll();
    } catch (e) {}
  }

  // ---- Init ----
  document.addEventListener("DOMContentLoaded", function () {
    initConverter();
    initDeepLink();
    $("order-qty").addEventListener("input", updateOrderTotal);
    $("coupon-apply").addEventListener("click", applyCoupon);
    $("order-coupon").addEventListener("input", function() {
      if (this.value.trim() === "") { couponDiscount = 0; $("coupon-msg").textContent = ""; updateOrderTotal(); }
    });
    $("order-submit").addEventListener("click", submitOrder);
    $("modal-close").addEventListener("click", function () { $("order-modal").classList.remove("open"); });
    $("confirm-close").addEventListener("click", function () { $("confirm-modal").classList.remove("open"); });
    $("confirm-ok").addEventListener("click", function () { $("confirm-modal").classList.remove("open"); });
    $("order-modal").addEventListener("click", function (e) {
      if (e.target === this) this.classList.remove("open");
    });
    $("confirm-modal").addEventListener("click", function (e) {
      if (e.target === this) this.classList.remove("open");
    });
    $("track-btn").addEventListener("click", trackOrder);
    renderAll();
    trackPageView();
    initPromoPopup();
  });

  // ---- 30% OFF launch promo popup ----
  function initPromoPopup() {
    try {
      if (localStorage.getItem("bk_promo_seen")) return;
    } catch (e) {}
    var overlay = $("promo-overlay");
    if (!overlay) return;
    function close() {
      overlay.style.display = "none";
      try { localStorage.setItem("bk_promo_seen", "1"); } catch (e) {}
    }
    setTimeout(function () { overlay.style.display = "flex"; }, 1200);
    $("promo-close").addEventListener("click", close);
    overlay.addEventListener("click", function (e) { if (e.target === overlay) close(); });
    $("promo-cta").addEventListener("click", function () {
      close();
      var sec = $("services");
      if (sec && sec.scrollIntoView) sec.scrollIntoView({ behavior: "smooth" });
    });
    var codeEl = $("promo-code");
    if (codeEl) codeEl.addEventListener("click", function () {
      var t = document.createElement("textarea");
      t.value = codeEl.textContent.trim();
      document.body.appendChild(t); t.select();
      try { document.execCommand("copy"); } catch (e) {}
      document.body.removeChild(t);
      codeEl.textContent = "Copied!";
      setTimeout(function () { codeEl.textContent = "FIRST30"; }, 1500);
    });
  }
})();
