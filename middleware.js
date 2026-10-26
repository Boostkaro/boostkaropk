// BoostKaro maintenance mode — added 2026-10-26 at Raji's order.
// Serves the approved "Update in Progress" page (HTTP 503) for every public
// page. Admin pages and /api stay live so existing orders keep syncing.
// To reopen the site: delete this file and push.
const HTML = "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n<meta charset=\"UTF-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n<meta name=\"robots\" content=\"noindex, nofollow\">\n<title>BoostKaro \u2014 Update in Progress</title>\n<style>\n  * { margin:0; padding:0; box-sizing:border-box; }\n  body {\n    font-family: 'Segoe UI', Arial, sans-serif;\n    background: linear-gradient(160deg, #0d47a1 0%, #1a73e8 60%, #2196f3 100%);\n    min-height: 100vh;\n    display: flex; align-items: center; justify-content: center;\n    padding: 24px;\n  }\n  .card {\n    background: #ffffff;\n    border-radius: 20px;\n    max-width: 620px; width: 100%;\n    padding: 44px 38px 36px;\n    text-align: center;\n    box-shadow: 0 24px 60px rgba(0,0,0,.35);\n    border-top: 8px solid #ffc107;\n  }\n  .logo { font-size: 34px; font-weight: 800; color: #0d47a1; letter-spacing: .5px; }\n  .logo span { color: #f5a600; }\n  .gear { font-size: 58px; margin: 18px 0 6px; }\n  h1 {\n    font-size: 30px; font-weight: 800; margin: 8px 0 10px;\n    background: linear-gradient(90deg, #0d47a1, #1a73e8);\n    -webkit-background-clip: text; background-clip: text; color: transparent;\n  }\n  .sorry { font-size: 17px; color: #444; line-height: 1.55; }\n  .note {\n    background: #fff8e1;\n    border: 1.5px solid #ffc107;\n    border-radius: 14px;\n    padding: 16px 18px;\n    margin: 24px 0 8px;\n    font-size: 15.5px; color: #5d4037; line-height: 1.6;\n    text-align: left;\n  }\n  .note b { color: #0d47a1; }\n  .foot { margin-top: 20px; font-size: 13px; color: #888; }\n</style>\n</head>\n<body>\n  <div class=\"card\">\n    <div class=\"logo\">Boost<span>Karo</span></div>\n    <div class=\"gear\">\ud83d\udee0\ufe0f</div>\n    <h1>Update in Progress</h1>\n    <p class=\"sorry\">Sorry for the inconvenience \u2014 our website is temporarily closed while we make it better for you. We will be back very soon.</p>\n    <div class=\"note\">\n      <b>\ud83d\udce6 Note for our customers:</b> If your ongoing order is taking longer than usual, or your followers are dropping, it is because of this update. Please don't worry \u2014 your order is safe and will be completed as soon as the update is finished.\n    </div>\n    <div class=\"note\">\n      <b>\ud83d\udcac Customer service:</b> All our customer service agents are busy with this update, so WhatsApp service may not be available as well. Replies may be delayed \u2014 thank you for understanding.\n    </div>\n    <div class=\"foot\">Thank you for your patience \u2014 Team BoostKaro</div>\n  </div>\n</body>\n</html>\n";

export const config = {
  matcher: ["/((?!api/|admin|maintenance|.*\..*).*)"],
};

export default function middleware() {
  return new Response(HTML, {
    status: 503,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "retry-after": "3600",
    },
  });
}
