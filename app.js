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
    instagram: "data:image/webp;base64,UklGRpoVAABXRUJQVlA4WAoAAAAQAAAAxwAAxwAAQUxQSDkCAAABDzD/ERGCcqxtkUblpbi32pkQCIXMhEwMxQ7BDGxnVxbuqJLiXTR8vP/gtIvo/wTgf+NBs6nSHixjIxsKd93qj61j1bfiittZx0URuNkpOGZV1wRx1nVDkCZFwQkoKxKn87dTd0mOB1VJeIqM+ZjEW5u4RdlKWPdbuvXbYbh2nOHcgdUwSCZTJ5lXwdR01eZNl82hch5wkuQKGAuirEjyi8K1hynjMgQMS0I1RHRLRDckNMs3GAbaQqHVVctxmvwDLtNlOkze8j2P01QNjsHkLBixmNoqo6vSDropydojoOob45bRVR4nM0beywBGBgURQKNTBACVvyk8gJNUOABF8wEANLgPRZo0RcTJzzUBjRFVM5hxKQ6QxKnwhaSXuJPkIfl4kQxFgUoyQtJ0nWRS5MVQDJJZkR7BO/obce+hvBO8DJ4pP2KoOMkYik4yvQQF7hY1jWQoCv87yUNyfEfSX5JC0lUJyAxJQOO3moSLB/5UZOBroIsADAUnlDgAlyboIoCmyQC6hp8CY8tNMk7K+i0JltkEWzK5/iRFFk2+2U5ZsFXZ8YDL5C9LOJ/DVUssJthgyWiWjG5I6LZmiBgWohqODXcZHGjyWGUU24G2OHDaAqzXapBMpkoyr7Kp2WgaG97CjWA4b+nWb9lQd2jgPVpIxts1Sbe2MkddeFCVHDp/u17glLhbkWA6BFmXZk0QZ1UQZpfgeFgRYLmXV2MrrrgdVj9t+VXZgnFsREvd8Bb8NPmLHv9jAgBWUDggOhMAALBVAJ0BKsgAyAA+MRSJQqIhIRhpRTQgAwSyC8ZpTX5gHe6UbC/nf8B+1n9Q92Ouf2r8R/3n9uvkB/iu+P7P/Qea7y5/zPui+HXrM/RPsK/p7/uusj+4Hqy/Zr9wPd8/3HrX/xnqGf1v/Sdbd6Ev7Z+mt+zPw6fuJ+zfsuf//NL/xk8If7h+RHY+ei/Yb90veCr2dd35X9p/z3FLvGv5Z/s+DF0f/M+gR7efK/+D/Z/Gg1AsgL9O/9X6yf2Dwp/oP+D9gj+Vf1//pfcB8Ev+j96/tQ/Lv7b/uf8b+TX2H/x7+bf7X+7/k78wHrc/Zj2KP1a/4v5/ps5znOc5znOcwxLCH4PvOnz/U8XQzVejxwcgMsrZQkWy4DY8LXNx8t76N2CPltMnPaJdUU7BA6r+ttoWVgBsgg9K60cv3umNcxOeaKRroQD2Vpd6cP9QEPzuWqP745P8va3vn94rbe5daKte1TJwCWH6zF4oBrbg1xmSnFe6JAMT1HdQBrxcSpFv+SZ4jUEoMjVAt2QO721C1WSA0YKjDvFuA47SdWM7PZYMp9uTGYk3UylnvQQgynmqreGAFOTfzJ5cF1zD5jr15M+I7Mnwl214OXUhlEuLuzeDmTtOsAcqtYVH4S5c5MJ3lejYVW/aJI2gojFgbD02wRUpAY38FsMa4DVKPJYcBFlVjJ/ri/aOFIwn8hX+NzFx+xMFDWjIxdBh+wUN98srJwqSQlyiIIY5pdxzheI/iSTDxU306ea0RX1gOFWDTQEsRbU9xr5mO2XMUIxA0SIFTOrR9fpw271dTyQTfkplVnXM6r/Z17t1GGwgc2PgEoo7yi5jQya3gvCuxc5k+P6dFr+kQi86TjyHKBMK3cMmEke9vzUQaG3aL0IEcebs5sM2nBAN9PKn/CL3UBBOspSlKUpSlKUpOgAA/v7deAAAdf/Av+ktPCgYpo+RCbH/VCMeUMnoAs1GO7utmA/LfH//jKAfWnnqtH7OwnzQPeqEOy+dZYQj3WxnzwPV523vvTyt79eBiQ3tFEjieCkeZrlWhnLhlAvNiqGG5aXZQdRYfMwrBiO4xaN34GVvlZjcsPQatM/PpY/8J7toPEmbYKpic/b/npVIWFpsEvwbamTY4QcMOL3m/bDVj3H4Ao7wavCup0N59yOXqdO6+RZrpjqjIqHmmztQNc82FqIrDii7Voavrn8/az5Fr0HsOf4tD7d1Wxonf+h71muv+el6W7h+tOnhdWY1Yck/4lNU0XP3ebTPo3BIdaWgflzPKnXNT1v7RjYTlwTcsqvEXcsv/tggm64TBzbywVvGRANaKndcN7MQuaJd5RI3U+5V6oSo/SdqAQE/ygCn6YNK46ww/SF762QyBOGFJnEv6Li9SmhQF3gChrx49EULDr+iO6Dmaza8gXd9A/JdkiPgqZmRQNOKo4XeBWr4SQT0HwDS91qZ1GWWoW/bXPemO6Pb/Cx95mW6szf0+7LQj2UTMLBTzmrzO5j2nX7k56rDoj0nC8Ew4ODU9jmwLdNYh8NdAdZNoMqWHlBenatV3Ox4yI5ZepgFdPE1VX5R7hsw6yuTzqNYSLQnekgKGjQqO/tjOBEL2SeeAKnFJuCxshnR7Pc5deLrlaMQ+foZQ1ujfndrNq4KLTSbZJ8Z6qGmdmLwzZeRiNL56X4JOCR+Uh124O0IrDVqTAOAeKVhIPTBcGzVSbvN2hPVTvyM8X3jMPDE4v7UapSp4OZdwbHk6cxoZ1GUnRr4qXLAqk6+DmCUcYWvQ7es7UZ/2ICz72b6dn+xEpq2jX4uvEOc46NwTVCaBWA/z6zxcheYJ0lkFAVMGInyL/kPGzBwZsv9MBZIsMk/e1lSHrAkO4QMKfBozgJlPK8247sYMPNkcM0MV9Zvi/DoBSnxQw6Uk2AwXycb3xtfG13XaKekS9KWxdprlr0Ywd2W+gWwLcwxLZHuchT/vwAr7wn4Vdgngf5aFAURCZ1wZykdh0eVCb70We83XNew0T0XRy2FFgRZE9LB34X40KEurX4Vl+VeIeDFqlGt+I4khlZBBjpIX1ZlSW3bPM2TeBuJ5ecfBXIbJSe+4ivcNvC36yZ8zV7ThJARYYVBMzZcO70dvk3JjI0euxCcgNlGUNTHyA4sRC9oq8m6hvjGqxINirgtt9Utv70vhH8TGSEF6vJCWFi3P+ww5KnUvAvCKzzIg249I14FcI3NNSC6jaDEM42b6ZtkOTpbohHkiygqN3keWrRvgWAEcHRpWTCV5hA9NkScf3ZgeH+FQLexAd4zymD40vAdIVHcZ3D+jxr1lPP5OtUiI2TcIkmv9e69xXZ3JOtDNYCOZyiq/WkS5Fa7q70YarvOZEoK0mVgo5g77c9dq7u355gRPcRuUjgVjY/VWrALLzp5X+/SwqQijRd60lvbq5prCrf4uqDg/GDYhJ4Kz+HvhcciWvqcqLdz5V6jab/P3/exbTOqL3BcRFemCKFrGOSQNZeAOevx5+XXc8eWqWrmqqznfoYRhf16uRnSyqpPOZGGVcN1YFVnD7ob/z/KPKO9tLbJ+79rfjIj1jcpbZCN9vEEHzrN80ShwP+y/yFjv/cpJ0yndmh8bZuux5To1efqnKhln7syfIi5j6zSJyEFfXo+hWDVUUkJnLdOvmu0RnhWyZ5g7PxDD1s3ECw9m/Y/3w6reS0NUJRuTTtDugJoCpT6zpc/+aeK1p1/nY3tyhcXvjSSi6OQVU9P8CeZ9fFb6JC2KNt5qb60J002Eyjb4haoYP2y6r8csgsxC+Rp2sa6O9Fq0g467YrFL/XbeGEGqcIkS1f6Gm7V35uqruz6NC1rY01CrcSiNxgs4esG3c9N41pR9BJ4grHkPx+3CxYznAKg/Cifz6i6xa78WOdj76YOuK9JAnDm80MPosgTJ+6X2soYrx88iUgq9yAdYUnCsanINS9aZBZxLwlwoUmilKtkqY6ICsY/rpQ63tfpXo6FzU35obr+WIzDiZM0Mawg+5lRbwJyk2hdmyn+IMFV2MtpmVLFO4qC4w272J0VznHeRq6r/lX/QDuK9Nx1LvHH904j6c0mcw/nRnlpNP81uf/df73+BWpLz5mE9vzV8ga/jfqI4rxZcMCZShoVqhwX9ACylRt06/q5I/JcVk9al+DrbetHknTHV//N0IKhmv1U4p4FNyjiXb0Ko8zBlHMCuSJcBM8ht7HyiAFbfoCgBkWR+K1Nmm2HHbedHO9xXWW1Ey8cyB3eiHeOxMDsCSf23WTtl+iN4/8C3PqKsq82tHYO7/wecfaQ8x7ZuEdN5fHXXZk2FhCy0N+403Fig9TC3BsBOO6TDDMoIX1Ju9bZU7tJr+bryOXYAHkeLdeVKBX208L4oseb/8LdEdxNYT7nf8E03at6HwJk+IS2f2WqKx6xZ+tZs7G3uHsBQZ4zKnTcXfBXS/xknFO1twcMqyB9pZsJkp9Ql6xZnXoqlrO4a2++EyJ4vkhX07ZYAXzevzXqV2FsfziGfmxTphFsFnACflRUVZLPBIiZWY8vBJjcSM5JYDyfl7DnVrWpzZ93MATM9snwlJrv+rrTz8apQ8589ZaZO0CTJxar86paabPhCR/ZaMayO46OlIsKt/RTwIqkyQm+IP7vr68g9PBI3Soww3/MWJ7f7IXbBSFZhoGc4J5dI0xPcKqK76YzXr6DzZuj6b5ynsrRMfY+PF7FafWXhLBXL5z5Ph5hVYbd+/YqJ1q48Ki3wlpTsDDpSWqsTawLIzD3yuZSstS/ZNzx4WHJiNHn3jjnfsb2/aU6WQqzJuhLBflduGSAHmIvsLhSPkL/3onEpK3+K3gb+EtLGzlkqX2WHpvi4vH7Te3fOYcUOeA5RgV1ssTLvZVWoyxP/6W3pKQGQ8DAghKGDnV6on2iK571mku8YVrvU0zJBJMv04cqWsRhgmoPH0yni/g9Nkfyzj/ouB3unMQfLnW3fpMEoG3Nf/foGd7dODezd2Yn3kFLqgcIKunwa7UOX508EB7dyrvZoKo5E7YNbkdx6OuZHinx2voGtX9v8wf+rPd9ofP0VEzAq1zvlZSyb/u7b9duwHAgt3MBgiNYOGLqn78wFploajaqnw2Xa6EX9nPfP0EvVrlJ6Wr6lGbVcWrigqe/a8jxXb4IoaxzvBZYfI+wVoCRfV7XNhyD25y4Tx4hfF8nZAfXtykwfDpbUqN6BMQaw/r7wEZBFO5HhyffFiJnikEEA4U9VM2dkS+pGYOnFLG8au5Re6NaN9OlP/dBl0xauGrIT9mHPfCyxIRHNwuzDvxonx0nXgbCI4ni0+PqzQWnRNBeFdTuN7Axh6vNNbJLf9nf0n5zR3yRdB6CL5YYTiz0csB4+g0carkSKV28ihsjQB8fJmx2ukrNUAL3QviEY9+WQcoS4H3Io+CvkmLxvagYMWBNjKS3nWNzIzZeU5O6PavoHwmne8qjUvwZLnwJEBBAz5Yw34fXj9m6n/qhJFEpFizr49hgvdjdEYNrHJSnvCYJXVkazUn29wD52htmOD3Ta9g11zRZj/mjZexrj/Xl0xJL7EpMOMVujGFXZd5w/Bgvs8fyGSDb86wnLfOGhw/pS8khWsiOJTbYuZ2gZaX3xvPv0lM9IPKC/Oown+2R8Hw/Bk0NjudJuMD7e5Sal5YhzdbfES5aThPac/aFle17fjt4fq0H87lMBn+4L+mdfHH3Cspy5aNqRy0v/dJ6GMiSkCcf4UvpXqzUvZ/UP/gCGfuODbblQjYkd2K+AG19JkypFoFSsNhfNGnd3qGKcQL1E+z6xmR0Ex2iYE+HhSOzHw4IjKkMOqamVCZXz8MPGqnhGAzkH540YBCGAvEi6O2xxSeaZX8p3u+SqX3hrxA7CmxO92jX/AXPzagapzOAORMwYTIgH9N2fk51v5KPbL0zuYOeaDGSPQqqWz6uypKTnlXlR2/JWqTMfP4BayZtEf5dQnV8BGAzysh2RuPcInveNNsWUR34z6bfuh2WbiJ4Jhl85fMrcbdB0ZnZiyknN4TF2UgPEnUrdMalTs699LBcaX/Bs2nOwjv/6q+XXz+GCecpEzhkWbZ+2QejlB9YLkukdtKlZrvFr3CbsvmSiQcw0hyy6O9hWxWVuIb8wBPDNNqA/neaOsB2wGi0YghgToqPfonXHrrpC2D3akDKMJqpYTrZ2Ut3wqg6m8LFhz1OXLTSRlKOecza8+IGuBJXy8l742KVgse3l0FhTIBdJdgJ5hDgYmcMNRlK/HpqbS0TgazWjlaUohxoQBCgTbWQ3oAr+rui5MH8C2Ll7CgsUhdFXZGQPcDUmL+4rgtzSOpCf5dGnnaGe0agXzjeDdX0KZlgkHMF8+1WMHvnlgFT6RWy3HQKN8eQDyBdbmjqPgI6QGlgauKrR/aErKLz3PKDBreySIqTWxXpQ12jW8HnTj+Btw19oPXM0DPEv9Wcf2bp1xj3s1/xilPskAp9nziycPoRmw2JdeZCCCT04kpmuslh+TmFy/wfvnAtxwSliasgIiagz8K/j172cDMAZk5OwgIOYYirkiU9yjopkMGQeVI1C7HIYFPgM4Kd0oi86xo5Ih44qKSheRI+p+TwWQ/5Y6wbmgKmizbmKH30s5hyBMVLLrLh2+PxspBzsbEGHR/VTZ2mHzO9/SupIWCD8ep99wnyx87SZRT0SGbLgaxabys3d0KEz0i2plpgNXnejOw2OWu+wYeUDCr/F9GB/FtXklRRGHca++CECwtjhSsGFzBrzOHfY2YjPQmp8klyHTDEgEOYgXOm+HS/4xflvWartYNr8yP255G7IruIZfSUV1FTwfTUE5HnNNMw4ZCG4AlIS7OSCiPNj6J6SS1114ULZ3AI964ti7ur5S1EM4oaOgukG8fIzne7REH6RSJkZRZVHWgge183adDpj5Ty6Lo4qpWD8hT1DucDyOZcwPfnVKvSyn3e7cM9NCPk7BiOTy0V1Wl9edL7NCNLFH6oIQI+jZlpbR9aap0c9EgMKS9G2NGeezZxZSjqkQvyO7wPh2WQQcDQM5b0CoU16Vi9w57b4G1NVwebtYIjyLx9AfZ13U+Moc3Lk1vJ9BqStv308VE1fq6R1wJ9abHPhYXEECVsUsoXWM2tQ+CuLku/oSCfIpj3Y2c6htn+iceDqFrVI2YB/5EXSW8J3xECTppirN+ix5LFLexct24wzbD9MRvcOINotVZWUBRYY6+ArM4RMhygMHVaPQWjcXq+spGGgrSKweUVxGgCkD0BHKXEy9gTcT26jAr9p3SUxEhJXyzVhgEEX5bI6F6zdkvxc/3hJ7gmq32VPA5KQECArid5k+UQXzZTZpTHqs3kDaCAB4zFZUJirJmP6rx9hdOJZPwG0E/y+BPcYhoMrw8V5NyqwDOPiKHxpDEiObt0Pk67nueHb6QeWnNLlGOI+LDIDZdh4XczP8U/c29C20C198YXwx2IymiT//zRBg7CSzHeQfypXQrqr+cPHuPJHrzMiSBu3rLD+MrkWge/ui3oxrMDXoJ8EcTlt87NipvkQfr0m7RilmZAA7w60Lgl2q6VImyp2TUwOy7yGqmILPWk0vh0w1gCuAwZABZiAAAA",
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
        // GA4: order_now_click
        if (typeof gtag === "function") {
          gtag("event", "order_now_click", {
            service: p.label + " " + c.label,
            tier: sc.label,
            price_usd: t.p
          });
        }
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
    // GA4: checkout_start (fires once per modal open)
    if (typeof gtag === "function") {
      gtag("event", "checkout_start", {
        service: sel.platform.label + " " + sel.category.label,
        tier: sel.subcat.label,
        price_usd: sel.tier.p
      });
    }
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
