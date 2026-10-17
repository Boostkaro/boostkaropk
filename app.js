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
          { p: 4.50, u: "k", s: "Custom comments" },
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
          { p: 65, u: "pkg", s: "SK — Real Active 50 Followers + Likes + Comments, 30 days" },
          { p: 70, u: "pkg", s: "BR — Real Active 50 Followers + Likes + Comments, 30 days" },
          { p: 75, u: "pkg", s: "Real Active 50 Followers + Likes + Comments, 30 days" },
          { p: 80, u: "pkg", s: "Arab — Real Active 50 Followers + Likes + Comments, 30 days" },
          { p: 87, u: "pkg", s: "USA — Real Active 50 Followers + Likes + Comments, 30 days" },
          { p: 100, u: "pkg", s: "Real Active 100 Followers + Likes + Comments, 30 days" },
          { p: 109, u: "pkg", s: "Arab — Real Active 100 Followers + Likes + Comments, 30 days" },
          { p: 120, u: "pkg", s: "USA — Real Active 100 Followers + Likes + Comments, 30 days" },
          { p: 159, u: "pkg", s: "Real Active 200 Followers + Likes + Comments, 30 days" }
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
    instagram: "logos/instagram.webp",
    tiktok: "logos/tiktok.webp",
    youtube: "logos/youtube.webp",
    facebook: "logos/facebook.webp",
    packages: "logos/packages.webp"
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
