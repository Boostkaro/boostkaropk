#!/usr/bin/env python3
"""
Generate SEO landing pages from the BoostKaro catalog in app.js.
Single source of truth: app.js CATALOG. Re-run to regenerate.

Usage: python3 generate_landing_pages.py [page1 page2 ...]
  e.g. python3 generate_landing_pages.py instagram-followers tiktok-followers
If no args, generates all 17 pages.
"""

import re
import os
import sys

# Page definitions: (url_slug, platform_id, category_id, title, h1, meta_desc, intro)
PAGES = {
    "instagram-followers": (
        "instagram", "followers",
        "Buy Instagram Followers in Pakistan | Affordable & Real | BoostKaro",
        "Buy Instagram Followers",
        "Buy Instagram followers in Pakistan from $2.60/1k (≈Rs 734). 6 quality tiers with refill guarantees. Pay via JazzCash/Easypaisa. No password needed.",
        "Growing on Instagram starts with social proof. BoostKaro offers 26 Instagram follower options across 6 quality tiers, from affordable high-drop options to premium non-drop followers with 30-day refill guarantees. All prices are per 1,000 followers in USD."
    ),
    "tiktok-followers": (
        "tiktok", "followers",
        "Buy TikTok Followers in Pakistan | Affordable Growth | BoostKaro",
        "Buy TikTok Followers",
        "Buy TikTok followers in Pakistan from $3.50/1k. Multiple quality tiers with fast delivery. Pay via JazzCash/Easypaisa. No password needed.",
        "TikTok growth depends on credibility. BoostKaro offers 11 TikTok follower options including normal high-quality followers and Brazil-targeted followers. Prices start at $3.50 per 1,000."
    ),
    "instagram-likes": (
        "instagram", "likes",
        "Buy Instagram Likes in Pakistan | High Quality Engagement | BoostKaro",
        "Buy Instagram Likes",
        "Buy Instagram likes in Pakistan from $0.52/1k. High-quality engagement, fast delivery. Pay via JazzCash/Easypaisa. No password needed.",
        "Boost your Instagram posts with likes that look natural. Choose from high-quality and budget-friendly options. All prices in USD per 1,000 likes."
    ),
    "instagram-views": (
        "instagram", "views",
        "Buy Instagram Views | Reels & Video Views | BoostKaro",
        "Buy Instagram Views",
        "Buy Instagram views for Reels and videos. Affordable packages with fast delivery. No password needed.",
        "Get more eyes on your Instagram content. BoostKaro offers Instagram views for Reels, videos, and stories at competitive prices."
    ),
    "instagram-comments": (
        "instagram", "comments",
        "Buy Instagram Comments | Custom & Real-Looking | BoostKaro",
        "Buy Instagram Comments",
        "Buy Instagram comments to boost engagement. Custom comments available. No password needed.",
        "Comments drive conversation and boost your post in the algorithm. Choose from custom and random comment options."
    ),
    "tiktok-likes": (
        "tiktok", "likes",
        "Buy TikTok Likes | Boost Your Videos | BoostKaro",
        "Buy TikTok Likes",
        "Buy TikTok likes to boost your videos. Country-targeted options available. No password needed.",
        "Likes signal quality to TikTok's algorithm. BoostKaro offers TikTok likes including Pakistan and Brazil targeted options."
    ),
    "tiktok-views": (
        "tiktok", "views",
        "Buy TikTok Views | Fast Delivery | BoostKaro",
        "Buy TikTok Views",
        "Buy TikTok views with fast delivery. Multiple packages available. No password needed.",
        "Views are the foundation of TikTok growth. Get affordable TikTok views with quick delivery times."
    ),
    "tiktok-comments": (
        "tiktok", "comments",
        "Buy TikTok Comments | Boost Engagement | BoostKaro",
        "Buy TikTok Comments",
        "Buy TikTok comments to increase engagement. No password needed, fast delivery.",
        "Comments make your TikTok videos look active and engaging. Choose from available comment packages."
    ),
    "facebook-followers": (
        "facebook", "profilefol",
        "Buy Facebook Followers in Pakistan | Page & Profile Growth | BoostKaro",
        "Buy Facebook Followers",
        "Buy Facebook followers in Pakistan from $1.00/1k. Options for pages and profiles. Pay via JazzCash/Easypaisa. No password needed.",
        "Grow your Facebook presence with real-looking followers. Options for both pages and personal profiles."
    ),
    "facebook-likes": (
        "facebook", "pagelikes",
        "Buy Facebook Likes | Page Likes & Post Likes | BoostKaro",
        "Buy Facebook Likes",
        "Buy Facebook page likes and post likes. Affordable options with fast delivery. No password needed.",
        "Likes build credibility on Facebook. Choose from page likes, post likes, and follower packages."
    ),
    "facebook-views": (
        "facebook", "videoviews",
        "Buy Facebook Views | Video Views | BoostKaro",
        "Buy Facebook Views",
        "Buy Facebook video views. Fast delivery, affordable prices. No password needed.",
        "Get more views on your Facebook videos. Simple ordering, quick results."
    ),
    "facebook-comments": (
        "facebook", "comments",
        "Buy Facebook Comments | Boost Posts | BoostKaro",
        "Buy Facebook Comments",
        "Buy Facebook comments for posts. Custom and random options. No password needed.",
        "Comments increase engagement on your Facebook posts. Available in custom and random varieties."
    ),
    "youtube-subscribers": (
        "youtube", "subscribers",
        "Buy YouTube Subscribers in Pakistan | Channel Growth | BoostKaro",
        "Buy YouTube Subscribers",
        "Buy YouTube subscribers in Pakistan from $35/1k. Gradual delivery options for channel growth. No password needed.",
        "Subscribers are key to YouTube monetization. BoostKaro offers subscriber packages with natural delivery speeds."
    ),
    "youtube-views": (
        "youtube", "views",
        "Buy YouTube Views | Real-Looking Views | BoostKaro",
        "Buy YouTube Views",
        "Buy YouTube views for your videos. Real-looking views with safe delivery. No password needed.",
        "Views boost your video's visibility in search and recommendations. Choose from available view packages."
    ),
    "youtube-watch-time": (
        "youtube", "watchtime",
        "Buy YouTube Watch Time | Monetization Help | BoostKaro",
        "Buy YouTube Watch Time",
        "Buy YouTube watch time hours for monetization. Safe delivery. No password needed.",
        "Watch time is required for YouTube monetization (4,000 hours). BoostKaro helps you reach that goal."
    ),
    "youtube-likes": (
        "youtube", "likes",
        "Buy YouTube Likes | Boost Video Ranking | BoostKaro",
        "Buy YouTube Likes",
        "Buy YouTube likes to improve video ranking. Fast delivery. No password needed.",
        "Likes help your videos rank higher in YouTube search. Affordable like packages available."
    ),
    "packages": (
        "packages", "growth",
        "Social Media Growth Packages | Bundles | BoostKaro",
        "Social Media Growth Packages",
        "Save with bundled social media growth packages. Multiple platforms, one price. No password needed.",
        "Get more value with bundled packages covering multiple platforms and services in one order."
    ),
}

# Related pages for internal linking (SEO + UX)
RELATED = {
    "instagram-followers": [("instagram-likes", "Buy Instagram Likes"), ("instagram-views", "Buy Instagram Views"), ("instagram-comments", "Buy Instagram Comments"), ("packages", "Instagram Growth Packages")],
    "instagram-likes": [("instagram-followers", "Buy Instagram Followers"), ("instagram-views", "Buy Instagram Views"), ("instagram-comments", "Buy Instagram Comments")],
    "instagram-views": [("instagram-followers", "Buy Instagram Followers"), ("instagram-likes", "Buy Instagram Likes"), ("instagram-comments", "Buy Instagram Comments")],
    "instagram-comments": [("instagram-followers", "Buy Instagram Followers"), ("instagram-likes", "Buy Instagram Likes"), ("instagram-views", "Buy Instagram Views")],
    "tiktok-followers": [("tiktok-likes", "Buy TikTok Likes"), ("tiktok-views", "Buy TikTok Views"), ("tiktok-comments", "Buy TikTok Comments")],
    "tiktok-likes": [("tiktok-followers", "Buy TikTok Followers"), ("tiktok-views", "Buy TikTok Views"), ("tiktok-comments", "Buy TikTok Comments")],
    "tiktok-views": [("tiktok-followers", "Buy TikTok Followers"), ("tiktok-likes", "Buy TikTok Likes"), ("tiktok-comments", "Buy TikTok Comments")],
    "tiktok-comments": [("tiktok-followers", "Buy TikTok Followers"), ("tiktok-likes", "Buy TikTok Likes"), ("tiktok-views", "Buy TikTok Views")],
    "facebook-followers": [("facebook-likes", "Buy Facebook Likes"), ("facebook-views", "Buy Facebook Views"), ("facebook-comments", "Buy Facebook Comments")],
    "facebook-likes": [("facebook-followers", "Buy Facebook Followers"), ("facebook-views", "Buy Facebook Views"), ("facebook-comments", "Buy Facebook Comments")],
    "facebook-views": [("facebook-followers", "Buy Facebook Followers"), ("facebook-likes", "Buy Facebook Likes"), ("facebook-comments", "Buy Facebook Comments")],
    "facebook-comments": [("facebook-followers", "Buy Facebook Followers"), ("facebook-likes", "Buy Facebook Likes"), ("facebook-views", "Buy Facebook Views")],
    "youtube-subscribers": [("youtube-views", "Buy YouTube Views"), ("youtube-likes", "Buy YouTube Likes"), ("youtube-watch-time", "Buy YouTube Watch Time")],
    "youtube-views": [("youtube-subscribers", "Buy YouTube Subscribers"), ("youtube-likes", "Buy YouTube Likes"), ("youtube-watch-time", "Buy YouTube Watch Time")],
    "youtube-likes": [("youtube-subscribers", "Buy YouTube Subscribers"), ("youtube-views", "Buy YouTube Views"), ("youtube-watch-time", "Buy YouTube Watch Time")],
    "youtube-watch-time": [("youtube-subscribers", "Buy YouTube Subscribers"), ("youtube-views", "Buy YouTube Views"), ("youtube-likes", "Buy YouTube Likes")],
    "packages": [("instagram-followers", "Buy Instagram Followers"), ("instagram-likes", "Buy Instagram Likes"), ("tiktok-followers", "Buy TikTok Followers")],
}

UNIT_LABEL = {"k": "per 1,000", "kh": "per 1,000 hours", "pkg": "per package", "ch": "per channel"}
# PKR rate mirrors app.js PKR_RATE — regenerate pages when the rate changes
PKR_RATE = 282.49

def fmt_pkr(usd):
    return f"Rs {usd * PKR_RATE:,.0f}"

def extract_category(platform_id, category_id):
    """Extract a category with subcats and tiers from app.js."""
    with open("app.js") as f:
        c = f.read()

    p_start = c.find(f'id: "{platform_id}"')
    next_p = len(c)
    for pid in ["instagram", "tiktok", "facebook", "youtube", "packages"]:
        if pid == platform_id:
            continue
        pos = c.find(f'id: "{pid}"', p_start + 10)
        if pos > 0 and pos < next_p:
            next_p = pos
    p_block = c[p_start:next_p]

    cat_pattern = r'\{\s*id:\s*"' + category_id + r'",\s*label:\s*"([^"]+)",\s*subcats:\s*\['
    f_match = re.search(cat_pattern, p_block)
    if not f_match:
        return None, None

    cat_label = f_match.group(1)
    f_start = f_match.end()
    depth, pos = 1, f_start
    while depth > 0 and pos < len(p_block):
        if p_block[pos] == "[":
            depth += 1
        elif p_block[pos] == "]":
            depth -= 1
        pos += 1
    f_block = p_block[f_start:pos-1]

    subcats = []
    sc_pattern = r'\{\s*id:\s*"(\w+)",\s*label:\s*"([^"]+)",\s*tiers:\s*\['
    for m in re.finditer(sc_pattern, f_block):
        sc_id, sc_label = m.group(1), m.group(2)
        sc_start = m.end()
        next_sc = f_block.find("{ id:", sc_start + 10)
        if next_sc < 0:
            next_sc = len(f_block)
        tier_block = f_block[sc_start:next_sc]
        tiers = re.findall(r'\{\s*p:\s*([\d.]+),\s*u:\s*"(\w+)",\s*s:\s*"([^"]*)"', tier_block)
        subcats.append({
            "id": sc_id, "label": sc_label,
            "tiers": [{"price": float(t[0]), "unit": t[1], "specs": t[2]} for t in tiers]
        })
    return cat_label, subcats

def generate_page(slug):
    platform_id, category_id, title, h1, meta_desc, intro = PAGES[slug]
    cat_label, subcats = extract_category(platform_id, category_id)
    if not subcats:
        print(f"ERROR: Could not extract {slug}")
        return False

    total_tiers = sum(len(sc["tiers"]) for sc in subcats)
    print(f"Generating {slug}: {len(subcats)} subcats, {total_tiers} tiers")

    # Build service cards (matching homepage .tier-card style)
    cards_html = ""
    for sc in subcats:
        # Find the actual minimum price for CHEAPEST badge (not just index 0)
        min_price = min(t["price"] for t in sc["tiers"])
        # If tie, badge goes to the first tier with the minimum price
        cheapest_idx = next(i for i, t in enumerate(sc["tiers"]) if t["price"] == min_price)
        cards = ""
        for idx, t in enumerate(sc["tiers"]):
            deep_link = f"/?platform={platform_id}&category={category_id}&subcat={sc['id']}&tier={idx}#services"
            unit_label = UNIT_LABEL.get(t["unit"], t["unit"])
            pkr = fmt_pkr(t["price"])
            is_cheapest = (idx == cheapest_idx)
            badge = ' <span class="tier-badge">Cheapest</span>' if is_cheapest else ""
            cards += f"""      <div class="tier-card{' cheapest' if is_cheapest else ''}">
{badge}
        <h3>{sc['label']}</h3>
        <p class="desc">{t['specs']}</p>
        <div class="price">${t['price']:.2f} <small>{unit_label} · ≈ {pkr}</small></div>
        <a class="btn block" href="{deep_link}">Order Now</a>
      </div>\n"""
        cards_html += f"""    <h3 class="subcat-heading">{sc['label']}</h3>
    <div class="tier-grid">\n{cards}    </div>\n"""

    # Platform name for display
    platform_names = {"instagram": "Instagram", "tiktok": "TikTok", "facebook": "Facebook", "youtube": "YouTube"}
    pname = platform_names.get(platform_id, platform_id.title())

    # Build related links HTML
    related_links = ""
    for rel_slug, rel_label in RELATED.get(slug, []):
        related_links += f'      <a href="/{rel_slug}" class="related-link">{rel_label}</a>\n'

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title}</title>
<meta name="description" content="{meta_desc}">
<meta name="robots" content="index, follow">
<link rel="canonical" href="https://www.boostkaropk.com/{slug}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="BoostKaro">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{meta_desc}">
<meta property="og:url" content="https://www.boostkaropk.com/{slug}">
<meta property="og:image" content="https://www.boostkaropk.com/logo.webp">
<link rel="stylesheet" href="styles.css">
<link rel="icon" type="image/webp" href="logo.webp">
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-V8HDW1W1P9"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){{dataLayer.push(arguments);}}
  gtag('js', new Date());
  gtag('config', 'G-V8HDW1W1P9');
</script>
</head>
<body>
<header class="site-header">
  <div class="container">
    <a class="logo" href="/"><img src="logo.webp" alt="BoostKaro">Boost<span>Karo</span></a>
    <nav class="nav-links">
      <a href="/#services" class="hide-mobile">Services</a>
      <a href="/#track">Track Order</a>
    </nav>
  </div>
</header>
<main class="container">
  <nav class="breadcrumbs"><a href="/">Home</a> › {pname} › {cat_label}</nav>
  <h1>{h1}</h1>
  <p class="lead">{intro}</p>
  <p>Prices in USD. Customers in Pakistan can pay in PKR via JazzCash / Easypaisa. No password needed — just your profile link.</p>

  <section class="service-listings">
    <h2>Available Options ({total_tiers} services)</h2>
{cards_html}  </section>

  <section class="faq-section">
    <h2>Frequently Asked Questions</h2>
    <details><summary>Do you need my social media password?</summary><p>Never. We only need your public profile links.</p></details>
    <details><summary>How fast is delivery?</summary><p>Most services start within hours. Speeds vary by tier — check the specifications for each option.</p></details>
    <details><summary>What if followers drop?</summary><p>Choose tiers with refill guarantees. If numbers drop within the guarantee period, contact us on WhatsApp for a refill.</p></details>
    <details><summary>How do I pay?</summary><p>Prices are in USD. Customers in Pakistan can pay via JazzCash or Easypaisa. International customers — contact us on WhatsApp to discuss payment options.</p></details>
  </section>

  <section class="related">
    <h2>Related Services</h2>
    <div class="related-grid">
{related_links}    </div>
    <p><a href="/">← Back to all services</a></p>
  </section>
</main>
<footer>
  <div class="container">
    <p>© 2026 BoostKaro — Social Media Growth Services.</p>
  </div>
</footer>
<a class="wa-float" href="https://wa.me/923340942542?text=Hi%20BoostKaro%2C%20I%20need%20help." target="_blank" rel="noopener">💬 WhatsApp</a>
<script>
// GA4: Track Order Now clicks on landing pages
document.addEventListener("DOMContentLoaded", function() {{
  document.querySelectorAll(".tier-card .btn.block").forEach(function(btn) {{
    btn.addEventListener("click", function() {{
      var card = btn.closest(".tier-card");
      var tier = card.querySelector("h3") ? card.querySelector("h3").textContent : "";
      var priceEl = card.querySelector(".price");
      var price = 0;
      if (priceEl) {{
        var m = priceEl.textContent.match(/\$([0-9.]+)/);
        if (m) price = parseFloat(m[1]);
      }}
      if (typeof gtag === "function") {{
        gtag("event", "order_now_click", {{
          service: document.querySelector("h1") ? document.querySelector("h1").textContent : "",
          tier: tier,
          price_usd: price
        }});
      }}
    }});
  }});
}});
</script>
</body>
</html>"""

    with open(f"{slug}.html", "w") as f:
        f.write(html)
    print(f"  Written: {slug}.html ({len(html)} bytes)")
    return True

if __name__ == "__main__":
    targets = sys.argv[1:] if len(sys.argv) > 1 else list(PAGES.keys())
    for slug in targets:
        if slug not in PAGES:
            print(f"Unknown page: {slug}")
            continue
        generate_page(slug)
    print("Done.")
