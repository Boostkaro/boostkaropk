/* BoostKaro admin panel logic */
(function () {
  "use strict";

  // Secure admin login via Supabase Auth (no client-side password).

  var SUPABASE_URL = "https://jixdvkssgqitqjucjiob.supabase.co";
  var SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppeGR2a3NzZ3FpdHFqdWNqaW9iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5Njk5NjYsImV4cCI6MjEwNzU0NTk2Nn0._UkyTqLweinByQpoyqXxhv-BIgciRhw59PY6sS8fb2E";

  var sb = null;
  try {
    sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch (e) {
    console.error("Supabase init failed:", e);
  }

  var allOrders = [];
  var activeTab = "review";

  // Status model (2026-10-22): statuses mirror the provider. "paid" means
  // Raji approved the payment and the order is queued — it only becomes
  // "processing" once the provider bridge has actually placed it.
  var STATUS_LABELS = {
    pending: "Pending",
    paid: "Paid — Queued",
    processing: "In Progress",
    completed: "Completed",
    cancelled: "Cancelled"
  };
  var STATUS_BADGES = {
    pending: "b-pending", paid: "b-paid", processing: "b-inprog",
    completed: "b-done", cancelled: "b-cancel"
  };
  var STATUS_OPTIONS = ["pending", "paid", "processing", "completed", "cancelled"];

  // Panel (PakistanPanels) service ID for each catalog service, keyed by
  // platform/service_type/quality-label — mirrors provider-map.json (the
  // bridge's map). Orders don't store a usable service id (the column is a
  // legacy UUID), so the admin derives it from the order's own fields.
  var SERVICE_IDS = {
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
    "instagram/followers/High Quality": 1497,
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

  function serviceIdOf(o) {
    var label = String(o.quality || "").split(" $")[0];
    return SERVICE_IDS[o.platform + "/" + o.service_type + "/" + label] || null;
  }

  function tabOf(status) {
    if (status === "pending") return "review";
    if (status === "paid" || status === "processing") return "approved";
    if (status === "completed") return "completed";
    if (status === "cancelled") return "rejected";
    return "review";
  }

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function fmtUSD(n) { return "$" + Number(n).toFixed(2); }
  function fmtPKR(n) { return "Rs " + Math.round(Number(n)).toLocaleString("en-US"); }

  // ---- Login (Supabase Auth — secure server-side check) ----
  function tryLogin() {
    var email = $("admin-email").value.trim();
    var pass = $("admin-pass").value;
    if (!email || !pass) {
      $("login-error").innerHTML = '<div class="alert error">Enter email and password.</div>';
      return;
    }
    $("login-error").innerHTML = '<p class="muted">Signing in…</p>';
    sb.auth.signInWithPassword({ email: email, password: pass })
      .then(function (res) {
        if (res.error) {
          $("login-error").innerHTML = '<div class="alert error">Login failed: ' + esc(res.error.message) + "</div>";
          return;
        }
        $("admin-login").style.display = "none";
        $("admin-panel").style.display = "block";
        loadOrders();
      })
      .catch(function (e) {
        $("login-error").innerHTML = '<div class="alert error">Login error.</div>';
      });
  }

  function logout() {
    if (sb) sb.auth.signOut();
    $("admin-panel").style.display = "none";
    $("admin-login").style.display = "block";
    $("admin-pass").value = "";
  }

  // ---- Load orders ----
  function loadOrders() {
    reviewsCache = null;
    if (!sb) {
      $("admin-msg").innerHTML = '<div class="alert error">Database not connected.</div>';
      return;
    }
    $("admin-msg").innerHTML = '<p class="muted">Loading orders…</p>';
    sb.from("orders").select("*").order("created_at", { ascending: false }).limit(500)
      .then(function (res) {
        if (res.error) {
          $("admin-msg").innerHTML = '<div class="alert error">Could not load orders: ' + esc(res.error.message) + "</div>";
          return;
        }
        allOrders = res.data || [];
        $("admin-msg").innerHTML = "";
        renderOrders();
        renderReviews();
      })
      .catch(function () {
        $("admin-msg").innerHTML = '<div class="alert error">Could not load orders. Check connection.</div>';
      });
  }

  function filteredOrders() {
    var q = $("filter-text").value.trim().toLowerCase();
    var st = $("filter-status").value;
    return allOrders.filter(function (o) {
      if (st && o.status !== st) return false;
      if (!q) return true;
      var hay = [o.order_code, o.customer_name, o.contact_number, o.transaction_id, o.profile_link]
        .join(" ").toLowerCase();
      return hay.indexOf(q) !== -1;
    });
  }

  function kv(label, valueHTML) {
    var row = document.createElement("div");
    row.className = "oc-kv";
    var s = document.createElement("span");
    s.textContent = label;
    var b = document.createElement("b");
    b.innerHTML = valueHTML;
    row.appendChild(s);
    row.appendChild(b);
    return row;
  }

  var reviewsCache = null;

  function renderReviews() {
    var list = $("reviews-list");
    if (!list) return;
    if (!sb) { list.innerHTML = '<div class="orders-empty muted">Not connected.</div>'; return; }
    if (reviewsCache) { paintReviews(reviewsCache); return; }
    list.innerHTML = '<div class="orders-empty muted">Loading reviews…</div>';
    sb.from("reviews").select("*").order("created_at", { ascending: false }).limit(200)
      .then(function (res) {
        if (res.error) {
          list.innerHTML = '<div class="orders-empty muted">Reviews are not set up yet — the one-time reviews SQL has not been run in Supabase.</div>';
          return;
        }
        reviewsCache = res.data || [];
        paintReviews(reviewsCache);
      })
      .catch(function () {
        list.innerHTML = '<div class="orders-empty muted">Could not load reviews.</div>';
      });
  }

  function paintReviews(rows) {
    var list = $("reviews-list");
    if (!list) return;
    list.innerHTML = "";
    $("reviews-count").textContent = "(" + rows.length + ")";
    if (!rows.length) {
      list.innerHTML = '<div class="orders-empty muted">No reviews yet.</div>';
      return;
    }
    rows.forEach(function (r) { list.appendChild(reviewCard(r)); });
  }

  // Same blue-bar accordion as the order cards: bar shows the order code +
  // star rating; details stay hidden until the bar is tapped.
  function reviewCard(r) {
    var card = document.createElement("div");
    card.className = "order-card";
    var d = new Date(r.created_at);
    var stars = "★★★★★".slice(0, r.rating) + "☆☆☆☆☆".slice(0, 5 - r.rating);

    var head = document.createElement("div");
    head.className = "oc-bar";
    head.setAttribute("role", "button");
    head.setAttribute("aria-expanded", "false");
    var code = document.createElement("strong");
    code.className = "code";
    code.textContent = r.order_code || "Review";
    var right = document.createElement("span");
    right.className = "oc-bar-right";
    var starSpan = document.createElement("span");
    starSpan.style.color = "#ffc107";
    starSpan.textContent = stars;
    var chev = document.createElement("span");
    chev.className = "oc-chev";
    chev.textContent = "▾";
    right.appendChild(starSpan);
    right.appendChild(chev);
    head.appendChild(code);
    head.appendChild(right);
    card.appendChild(head);

    var details = document.createElement("div");
    details.className = "oc-details";
    card.appendChild(details);

    head.addEventListener("click", function () {
      var open = details.classList.toggle("open");
      chev.textContent = open ? "▴" : "▾";
      head.setAttribute("aria-expanded", open ? "true" : "false");
    });

    details.appendChild(kv("Customer", esc(r.customer_name || "—")));
    details.appendChild(kv("Rating", r.rating + " / 5 — " + stars));
    details.appendChild(kv("Review", esc(r.review_text || "")));
    details.appendChild(kv("Date", esc(d.toLocaleString())));

    var actions = document.createElement("div");
    actions.className = "oc-actions";
    var del = document.createElement("button");
    del.className = "btn-reject";
    del.textContent = "🗑 Delete Review";
    del.addEventListener("click", function () {
      if (!window.confirm("Delete this review permanently?")) return;
      del.disabled = true;
      del.textContent = "Deleting…";
      sb.from("reviews").delete().eq("id", r.id).then(function (res) {
        if (res.error) {
          del.disabled = false;
          del.textContent = "🗑 Delete Review";
          window.alert("Could not delete this review — the one-time delete permission may not be added yet.");
          return;
        }
        reviewsCache = (reviewsCache || []).filter(function (x) { return x.id !== r.id; });
        paintReviews(reviewsCache);
      });
    });
    actions.appendChild(del);
    details.appendChild(actions);
    return card;
  }

  function renderOrders() {
    var rows = filteredOrders();
    var counts = { review: 0, approved: 0, completed: 0, rejected: 0 };
    rows.forEach(function (o) { counts[tabOf(o.status)]++; });
    ["review", "approved", "completed", "rejected"].forEach(function (t) {
      $("cnt-" + t).textContent = "(" + counts[t] + ")";
      var btn = document.querySelector('.admin-tab[data-tab="' + t + '"]');
      if (btn) btn.classList.toggle("on", t === activeTab);
    });

    var shown = rows.filter(function (o) { return tabOf(o.status) === activeTab; });
    $("orders-count").textContent = "(" + shown.length + " of " + allOrders.length + ")";
    var list = $("orders-list");
    list.innerHTML = "";
    if (!shown.length) {
      list.innerHTML = '<div class="orders-empty muted">No orders in this group.</div>';
      return;
    }
    shown.forEach(function (o) { list.appendChild(orderCard(o)); });
    paintAffiliates();
  }

  function orderCard(o) {
    var card = document.createElement("div");
    card.className = "order-card";
    var d = new Date(o.created_at);

    // Blue-bar accordion: the order code + status live on a #0d47a1 bar
    // (same blue as the admin brand bar). Details stay hidden until the
    // bar is tapped; tapping again collapses them. Each card toggles
    // independently and every re-render starts collapsed.
    var head = document.createElement("div");
    head.className = "oc-bar";
    head.setAttribute("role", "button");
    head.setAttribute("aria-expanded", "false");
    var code = document.createElement("strong");
    code.className = "code";
    code.textContent = o.order_code;
    var right = document.createElement("span");
    right.className = "oc-bar-right";
    if (o.affiliated) {
      var ab = document.createElement("span");
      ab.className = "badge";
      ab.style.background = "#fff3cd";
      ab.style.color = "#7a5b00";
      ab.textContent = o.affiliate_claimed ? "🤝 Claimed" : "🤝 Affiliate";
      right.appendChild(ab);
    }
    var badge = document.createElement("span");
    badge.className = "badge " + (STATUS_BADGES[o.status] || "b-pending");
    badge.textContent = STATUS_LABELS[o.status] || o.status;
    var chev = document.createElement("span");
    chev.className = "oc-chev";
    chev.textContent = "▾";
    right.appendChild(badge);
    right.appendChild(chev);
    head.appendChild(code);
    head.appendChild(right);
    card.appendChild(head);

    var details = document.createElement("div");
    details.className = "oc-details";
    card.appendChild(details);

    head.addEventListener("click", function () {
      var open = details.classList.toggle("open");
      chev.textContent = open ? "▴" : "▾";
      head.setAttribute("aria-expanded", open ? "true" : "false");
    });

    details.appendChild(kv("Placed", esc(d.toLocaleString())));
    details.appendChild(kv("Service", esc(o.platform) + " · " + esc(o.service_type) + " — " + esc(o.quality)));
    var sid = serviceIdOf(o);
    if (sid) details.appendChild(kv("Service ID", sid));
    details.appendChild(kv("Link", "<a href='" + esc(o.profile_link) + "' target='_blank' rel='noopener'>" + esc(o.profile_link) + " ↗</a>"));
    details.appendChild(kv("Quantity", Number(o.quantity).toLocaleString()));
    details.appendChild(kv("Price", fmtUSD(o.price_usd) + " · " + fmtPKR(o.price_pkr)));
    details.appendChild(kv("Customer", esc(o.customer_name || "—") + " · " + esc(o.contact_number)));
    details.appendChild(kv("TID", esc(o.transaction_id || "—")));

    // Provider bridge info (columns exist after the one-time bridge SQL;
    // absent on older rows, so this simply renders nothing until then).
    if (o.provider_order_id) {
      details.appendChild(kv("Panel Order ID", "#" + esc(o.provider_order_id) +
        (o.provider_status ? " · " + esc(o.provider_status) : "")));
    }

    // WhatsApp auto-message delivery record (wa_*_sent_at written by the
    // order-events endpoint when each template is actually sent).
    var waBits = [];
    if (o.wa_paid_sent_at) waBits.push("✅ Payment confirmed — " + esc(new Date(o.wa_paid_sent_at).toLocaleString()));
    if (o.wa_rejected_sent_at) waBits.push("⚠️ Payment rejected — " + esc(new Date(o.wa_rejected_sent_at).toLocaleString()));
    if (o.wa_completed_sent_at) waBits.push("🎉 Completed — " + esc(new Date(o.wa_completed_sent_at).toLocaleString()));
    if (waBits.length) details.appendChild(kv("Auto WhatsApp", waBits.join("<br>")));

    var actions = document.createElement("div");
    actions.className = "oc-actions";

    var sel = document.createElement("select");
    STATUS_OPTIONS.forEach(function (s) {
      var opt = document.createElement("option");
      opt.value = s;
      opt.textContent = STATUS_LABELS[s];
      if (o.status === s) opt.selected = true;
      sel.appendChild(opt);
    });
    sel.setAttribute("data-id", o.id);
    actions.appendChild(sel);

    var note = document.createElement("input");
    note.type = "text";
    note.value = o.admin_note || "";
    note.placeholder = "note…";
    note.setAttribute("data-id", o.id);
    actions.appendChild(note);

    var saveBtn = document.createElement("button");
    saveBtn.type = "button";
    saveBtn.className = "btn";
    saveBtn.textContent = "Save";
    saveBtn.addEventListener("click", function () {
      saveOrder(o.id, sel.value, note.value);
    });
    actions.appendChild(saveBtn);

    // Approved flow (2026-10-22): for unpaid orders, Mark as Paid confirms
    // the payment (status -> paid: approved + queued, NOT yet with the
    // provider). The bridge places the provider order and only then flips
    // the status to processing, so the admin always mirrors the provider.
    // Reject cancels the order; nothing is ever sent to the provider.
    if (o.status === "pending") {
      var paidBtn = document.createElement("button");
      paidBtn.type = "button";
      paidBtn.className = "btn btn-paid";
      paidBtn.textContent = "✓ Mark as Paid";
      paidBtn.addEventListener("click", function () { saveOrder(o.id, "paid", note.value); });
      var rejBtn = document.createElement("button");
      rejBtn.type = "button";
      rejBtn.className = "btn btn-reject";
      rejBtn.textContent = "✗ Reject";
      rejBtn.addEventListener("click", function () { saveOrder(o.id, "cancelled", note.value); });
      actions.appendChild(paidBtn);
      actions.appendChild(rejBtn);
    }

    // Affiliate flag only — all affiliate details (name/number, claim,
    // payment) are managed in the Affiliated Orders panel below Reviews.
    var affWrap = document.createElement("div");
    affWrap.className = "oc-actions";
    var affLabel = document.createElement("label");
    var affChk = document.createElement("input");
    affChk.type = "checkbox";
    affChk.checked = !!o.affiliated;
    affLabel.appendChild(affChk);
    affLabel.appendChild(document.createTextNode(" 🤝 Affiliated order"));
    affWrap.appendChild(affLabel);
    affChk.addEventListener("change", function () {
      saveAffiliate(o.id, {
        affiliated: affChk.checked,
        affiliate_claimed: affChk.checked ? !!o.affiliate_claimed : false
      });
    });
    details.appendChild(affWrap);

    details.appendChild(actions);
    return card;
  }

  function saveOrder(id, status, note) {
    $("admin-msg").innerHTML = "";
    sb.from("orders")
      .update({ status: status, admin_note: note || null, updated_at: new Date().toISOString() })
      .eq("id", id)
      .then(function (res) {
        if (res.error) {
          $("admin-msg").innerHTML =
            '<div class="alert error">Update blocked by database permissions — change status in Supabase dashboard → Table Editor → orders. (' +
            esc(res.error.message) + ")</div>";
          return;
        }
        var o = allOrders.find(function (x) { return x.id === id; });
        if (o) { o.status = status; o.admin_note = note; }
        $("admin-msg").innerHTML = '<div class="alert ok">Order updated.</div>';
        renderOrders();
        setTimeout(function () { $("admin-msg").innerHTML = ""; }, 2500);
      })
      .catch(function () {
        $("admin-msg").innerHTML = '<div class="alert error">Update failed. Try again.</div>';
      });
  }

  function saveAffiliate(id, patch) {
    sb.from("orders").update(patch).eq("id", id)
      .then(function (res) {
        if (res.error) {
          $("admin-msg").innerHTML = '<div class="alert error">Affiliate update failed: ' + esc(res.error.message) + "</div>";
          return;
        }
        var o = allOrders.find(function (x) { return x.id === id; });
        if (o) { Object.keys(patch).forEach(function (k) { o[k] = patch[k]; }); }
        $("admin-msg").innerHTML = '<div class="alert ok">Affiliate status updated.</div>';
        renderOrders();
        setTimeout(function () { $("admin-msg").innerHTML = ""; }, 2000);
      })
      .catch(function () {
        $("admin-msg").innerHTML = '<div class="alert error">Affiliate update failed. Try again.</div>';
      });
  }


  // ---- Affiliated orders panel (below Reviews) ----
  // Accordion cards in the same style as Orders: blue bar on top, tap to
  // expand. Everything affiliate-related lives here: affiliate name/number,
  // the 10% earning, and the claimed / not-claimed state.
  function paintAffiliates() {
    var list = $("affiliates-list");
    if (!list) return;
    var rows = (allOrders || []).filter(function (o) { return o.affiliated; });
    $("affiliates-count").textContent = "(" + rows.length + ")";
    var total = 0, due = 0, claimedAmt = 0;
    rows.forEach(function (o) {
      var earn = Number(o.price_usd || 0) * 0.10;
      total += earn;
      if (o.affiliate_claimed) claimedAmt += earn; else if (o.status === "completed") due += earn;
    });
    $("affiliates-summary").innerHTML =
      "Total 10% earned: <strong>" + fmtUSD(total) + "</strong>" +
      " · Ready to pay (completed, unclaimed): <strong>" + fmtUSD(due) + "</strong>" +
      " · Already claimed: <strong>" + fmtUSD(claimedAmt) + "</strong>" +
      "<br>Affiliates are paid only after the order completes successfully.";
    if (!rows.length) {
      list.innerHTML = '<div class="orders-empty muted">No affiliated orders yet. Tick "🤝 Affiliated order" on any order card and it will appear here.</div>';
      return;
    }
    list.innerHTML = "";
    rows.forEach(function (o) { list.appendChild(affiliateCard(o)); });
  }

  function affiliateCard(o) {
    var earn = Number(o.price_usd || 0) * 0.10;
    var d = new Date(o.created_at);
    var card = document.createElement("div");
    card.className = "order-card";

    var head = document.createElement("div");
    head.className = "oc-bar";
    head.setAttribute("role", "button");
    head.setAttribute("aria-expanded", "false");
    var code = document.createElement("strong");
    code.className = "code";
    code.textContent = o.order_code;
    var right = document.createElement("span");
    right.className = "oc-bar-right";
    var st = document.createElement("span");
    st.className = "badge " + (STATUS_BADGES[o.status] || "b-pending");
    st.textContent = STATUS_LABELS[o.status] || o.status;
    var cb = document.createElement("span");
    cb.className = "badge";
    if (o.affiliate_claimed) { cb.style.background = "#d4edda"; cb.style.color = "#155724"; cb.textContent = "✅ Claimed"; }
    else { cb.style.background = "#fff3cd"; cb.style.color = "#7a5b00"; cb.textContent = "🤝 Not claimed"; }
    var chev = document.createElement("span");
    chev.className = "oc-chev";
    chev.textContent = "▾";
    right.appendChild(st); right.appendChild(cb); right.appendChild(chev);
    head.appendChild(code); head.appendChild(right);
    card.appendChild(head);

    var details = document.createElement("div");
    details.className = "oc-details";
    card.appendChild(details);
    head.addEventListener("click", function () {
      var open = details.classList.toggle("open");
      chev.textContent = open ? "▴" : "▾";
      head.setAttribute("aria-expanded", open ? "true" : "false");
    });

    details.appendChild(kv("Placed", esc(d.toLocaleString())));
    details.appendChild(kv("Customer", esc(o.customer_name || "—") + " · " + esc(o.contact_number || "")));
    details.appendChild(kv("Service", esc(o.platform) + " · " + esc(o.service_type) + " — " + esc(o.quality)));
    details.appendChild(kv("Order amount", fmtUSD(o.price_usd) + " · " + fmtPKR(o.price_pkr)));
    details.appendChild(kv("Affiliate earns (10%)", "<strong>" + fmtUSD(earn) + "</strong>"));

    var row = document.createElement("div");
    row.className = "oc-actions";
    var info = document.createElement("input");
    info.type = "text";
    info.placeholder = "Affiliate name / number…";
    info.value = o.affiliate_info || "";
    row.appendChild(info);
    var claimLabel = document.createElement("label");
    var claimChk = document.createElement("input");
    claimChk.type = "checkbox";
    claimChk.checked = !!o.affiliate_claimed;
    claimLabel.appendChild(claimChk);
    claimLabel.appendChild(document.createTextNode(" ✅ Claimed (paid)"));
    row.appendChild(claimLabel);
    function affSave() {
      saveAffiliate(o.id, {
        affiliated: true,
        affiliate_claimed: claimChk.checked,
        affiliate_info: info.value.trim() || null
      });
    }
    claimChk.addEventListener("change", affSave);
    info.addEventListener("change", affSave);
    details.appendChild(row);
    return card;
  }

  // ---- Init ----
  document.addEventListener("DOMContentLoaded", function () {
    $("login-btn").addEventListener("click", tryLogin);
    $("admin-pass").addEventListener("keydown", function (e) {
      if (e.key === "Enter") tryLogin();
    });
    var lb = $("logout-btn");
    if (lb) lb.addEventListener("click", logout);
    $("refresh-btn").addEventListener("click", loadOrders);
    $("filter-text").addEventListener("input", renderOrders);
    $("filter-status").addEventListener("change", renderOrders);
    document.querySelectorAll(".admin-tab").forEach(function (btn) {
      btn.addEventListener("click", function () {
        activeTab = btn.getAttribute("data-tab");
        renderOrders();
      });
    });
    // Restore session if already logged in
    if (sb) {
      sb.auth.getSession().then(function (res) {
        if (res.data && res.data.session) {
          $("admin-login").style.display = "none";
          $("admin-panel").style.display = "block";
          loadOrders();
        }
      });
    }
  });
})();

  // ---- Section box counts sync (2026-10-24) ----
  // Keep the box counts in sync with each section's own count label.
  [["orders-count", "box-orders-count"], ["reviews-count", "box-reviews-count"], ["affiliates-count", "box-affiliates-count"]].forEach(function (pair) {
    var src = document.getElementById(pair[0]), dst = document.getElementById(pair[1]);
    if (!src || !dst) return;
    var sync = function () { dst.textContent = src.textContent; };
    sync();
    new MutationObserver(sync).observe(src, { childList: true, characterData: true, subtree: true });
  });
