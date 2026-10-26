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
  var waByOrder = {}; // order_code -> [wa_messages rows, newest first]
  var affiliateDirectory = []; // rows from the affiliates table (directory)
  var activeTab = "review";

  // Status model (2026-10-22): statuses mirror the provider. "paid" means
  // Raji approved the payment and the order is queued — it only becomes
  // "processing" once the provider bridge has actually placed it.
  var STATUS_LABELS = {
    pending: "Confirmation",
    paid: "Paid — Queued",
    placed: "Pending",
    processing: "In Progress",
    completed: "Completed",
    cancelled: "Cancelled"
  };
  var STATUS_BADGES = {
    pending: "b-pending", paid: "b-paid", placed: "b-placed", processing: "b-inprog",
    completed: "b-done", cancelled: "b-cancel"
  };
  var STATUS_OPTIONS = ["pending", "paid", "placed", "processing", "completed", "cancelled"];

  // Panel (GeoSMM) service ID for each catalog service, keyed by
  // platform/service_type/quality-label — mirrors the bridge's PROVIDER_MAP
  // in api/order-events.js. Orders don't store a usable service id (the
  // column is a legacy UUID), so the admin derives it from the order's own
  // fields. Tiers with no GeoSMM service (Facebook comments & video views,
  // YouTube subscribers & views) show no ID and are handled manually.
  // (GeoSMM from 2026-10-25.)
  var SERVICE_IDS = {
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

  function serviceIdOf(o) {
    // Quality arrives as "No Drop Rs 1,300/1k" — match the tier label
    // by prefix (same approach as the bridge's tierFor).
    var raw = String(o.quality || "").trim();
    var known = ["High Quality", "No Drop", "Droppable"];
    var label = raw.split(" Rs ")[0];
    for (var i = 0; i < known.length; i++) {
      if (raw.indexOf(known[i]) === 0) { label = known[i]; break; }
    }
    return SERVICE_IDS[o.platform + "/" + o.service_type + "/" + label] || null;
  }

  function tabOf(status) {
    if (status === "pending") return "review";
    if (status === "placed") return "pending";
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
        loadAffiliateDirectory();
        // Delivery receipts live in wa_messages (may not exist yet if
        // the one-time SQL hasn't been run — then just render as before).
        sb.from("wa_messages").select("*").order("sent_at", { ascending: false }).limit(1000)
          .then(function (wres) {
            waByOrder = {};
            if (!wres.error && wres.data) {
              wres.data.forEach(function (m) {
                if (!m.order_code) return;
                (waByOrder[m.order_code] = waByOrder[m.order_code] || []).push(m);
              });
            }
            renderOrders();
            renderReviews();
          }, function () {
            waByOrder = {};
            renderOrders();
            renderReviews();
          });
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
    var counts = { review: 0, approved: 0, pending: 0, completed: 0, rejected: 0 };
    rows.forEach(function (o) { counts[tabOf(o.status)]++; });
    ["review", "approved", "pending", "completed", "rejected"].forEach(function (t) {
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
    details.appendChild(kv("Price", fmtPKR(o.price_pkr)));
    details.appendChild(kv("Customer", esc(o.customer_name || "—") + " · " + esc(o.contact_number)));
    details.appendChild(kv("TID", esc(o.transaction_id || "—")));

    // Provider bridge info (columns exist after the one-time bridge SQL;
    // absent on older rows, so this simply renders nothing until then).
    if (o.provider_order_id) {
      details.appendChild(kv("Panel Order ID", "#" + esc(o.provider_order_id) +
        (o.provider_status ? " · " + esc(o.provider_status) : "")));
    }

    // WhatsApp auto-message record. Preferred source: wa_messages rows —
    // Meta's own delivery receipts (delivered / read / failed) matched by
    // message ID. Fallback: the wa_*_sent_at flags, which only prove the
    // send was accepted (messages sent before delivery tracking existed
    // have no receipts and can never be proven delivered after the fact).
    // The Auto WhatsApp row ALWAYS renders — even when nothing was sent
    // yet — so every order shows the state of each customer message.
    var waMsgs = waByOrder[o.order_code] || [];
    var when = function (v) { return v ? " — " + esc(new Date(v).toLocaleString()) : ""; };
    function waMsgFor(tpl) {
      var m = null;
      waMsgs.forEach(function (x) { if (!m && x.template === tpl) m = x; });
      return m;
    }
    function waStateText(m) {
      if (!m) return null;
      if (m.status === "read") return "👀 Read" + when(m.read_at || m.updated_at);
      if (m.status === "delivered") return "✔✔ Delivered" + when(m.delivered_at || m.updated_at);
      if (m.status === "failed") return "❌ FAILED" + when(m.failed_at) +
        (m.error_message ? " — " + esc(m.error_message) : "");
      if (m.status === "send_failed") return "❌ SEND FAILED" + when(m.sent_at) +
        (m.error_message ? " — " + esc(m.error_message) : "");
      // "accepted" and "sent" both display simply as Sent.
      return "✔ Sent" + when(m.status === "sent" ? m.updated_at : m.sent_at);
    }
    function waLine(label, tpl, flagAt, showWhenEmpty) {
      var m = waMsgFor(tpl);
      if (m) return label + ": " + waStateText(m);
      if (flagAt) return label + ": ✔ Sent " + esc(new Date(flagAt).toLocaleString()) + " (delivery not tracked)";
      // Raji's rule: no "not sent" wording — the line stays, its state
      // is simply empty until the message is sent.
      return showWhenEmpty ? label + ":" : null;
    }
    var waBits = [];
    // Payment confirmed + Completed lines always show, even when empty.
    var l1 = waLine("✅ Payment confirmed", "order_received_payment_confirmed", o.wa_paid_sent_at, true);
    if (l1) waBits.push(l1);
    var l3 = waLine("🎉 Completed", "order_completed", o.wa_completed_sent_at, true);
    if (l3) waBits.push(l3);
    // Rejected line shows when the order is cancelled or a send/flag exists.
    var l2 = waLine("⚠️ Payment rejected", "order_received_payment_rejected", o.wa_rejected_sent_at,
      o.status === "cancelled");
    if (l2) waBits.push(l2);
    var alertMsg = waMsgFor("new_order_alert");
    if (alertMsg) waBits.push("🔔 Admin alert: " + waStateText(alertMsg));
    details.appendChild(kv("Auto WhatsApp", waBits.join("<br>")));

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
      var earn = Number(o.price_pkr || 0) * 0.10;
      total += earn;
      if (o.affiliate_claimed) claimedAmt += earn; else if (o.status === "completed") due += earn;
    });
    $("affiliates-summary").innerHTML =
      "Total 10% earned: <strong>" + fmtPKR(total) + "</strong>" +
      " · Ready to pay (completed, unclaimed): <strong>" + fmtPKR(due) + "</strong>" +
      " · Already claimed: <strong>" + fmtPKR(claimedAmt) + "</strong>" +
      "<br>Affiliates are paid only after the order completes successfully.";
    if (!rows.length) {
      list.innerHTML = '<div class="orders-empty muted">No affiliated orders yet. Tick "🤝 Affiliated order" on any order card and it will appear here.</div>';
      return;
    }
    list.innerHTML = "";
    rows.forEach(function (o) { list.appendChild(affiliateCard(o)); });
  }

  function affiliateCard(o) {
    var earn = Number(o.price_pkr || 0) * 0.10;
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
    details.appendChild(kv("Order amount", fmtPKR(o.price_pkr)));
    details.appendChild(kv("Affiliate earns (10%)", "<strong>" + fmtPKR(earn) + "</strong>"));

    var row = document.createElement("div");
    row.className = "oc-actions";
    var info = document.createElement("input");
    info.type = "text";
    info.placeholder = "Affiliate name / number…";
    info.value = o.affiliate_info || "";
    // Affiliater picker: the AF number belongs to the PERSON (one row in
    // the Affiliates List) and stays the same across all their orders.
    var affSel = document.createElement("select");
    var opt0 = document.createElement("option");
    opt0.value = "";
    opt0.textContent = affiliateDirectory.length ? "Select affiliater (unique AF ID)…" : "No affiliaters in the list yet";
    affSel.appendChild(opt0);
    affiliateDirectory.forEach(function (a) {
      var label = fmtAffiliateNo(a.affiliate_no) + " · " + (a.name || "");
      var opt = document.createElement("option");
      opt.value = label;
      opt.textContent = label;
      if (o.affiliate_info && o.affiliate_info.indexOf(fmtAffiliateNo(a.affiliate_no)) === 0) opt.selected = true;
      affSel.appendChild(opt);
    });
    affSel.addEventListener("change", function () {
      if (!affSel.value) return;
      info.value = affSel.value;
      affSave();
    });
    row.appendChild(affSel);
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

  // ---- Affiliates List (directory, under Affiliated Orders) ----
  // One card per affiliate with a unique AF number (assigned by the
  // database), name, WhatsApp and bank/payment details. Lives on the
  // Affiliates page; every lookup is guarded so other admin pages that
  // share this script are unaffected. Needs the one-time affiliates
  // table SQL — until it is run, the panel explains that instead of
  // breaking.
  function fmtAffiliateNo(n) {
    var s = String(Number(n) || 0);
    while (s.length < 3) s = "0" + s;
    return "AF-" + s;
  }
  function waLinkOf(raw) {
    var n = String(raw || "").replace(/[^0-9]/g, "");
    if (n.startsWith("0")) n = "92" + n.slice(1);
    else if (n.length === 10 && n.startsWith("3")) n = "92" + n;
    return n ? "https://wa.me/" + n : "";
  }
  function setAfdMsg(html) {
    var el = $("afd-msg");
    if (el) el.innerHTML = html || "";
  }
  function loadAffiliateDirectory() {
    if (!sb) return;
    if (!$("affiliate-directory-list") && !$("affiliates-list")) return;
    sb.from("affiliates").select("*").order("affiliate_no", { ascending: true }).limit(500)
      .then(function (res) {
        if (res.error) {
          setAfdMsg('<div class="alert error">Affiliates List is not active yet — run the one-time <b>supabase-affiliates-directory.sql</b> in Supabase, then refresh.</div>');
          return;
        }
        affiliateDirectory = res.data || [];
        paintAffiliateDirectory();
        paintAffiliates(); // refresh the order cards' affiliater picker
      }, function () {
        setAfdMsg('<div class="alert error">Could not load the Affiliates List. Try refresh.</div>');
      });
  }
  function paintAffiliateDirectory() {
    var list = $("affiliate-directory-list");
    if (!list) return;
    var cnt = $("affiliate-directory-count");
    if (cnt) cnt.textContent = "(" + affiliateDirectory.length + ")";
    var q = ($("afd-search") && $("afd-search").value || "").trim().toLowerCase();
    var rows = affiliateDirectory.filter(function (a) {
      if (!q) return true;
      var hay = [fmtAffiliateNo(a.affiliate_no), a.name, a.whatsapp, a.bank_details]
        .join(" ").toLowerCase();
      return hay.indexOf(q) !== -1;
    });
    list.innerHTML = "";
    if (!rows.length) {
      list.innerHTML = '<div class="orders-empty muted">' +
        (affiliateDirectory.length ? "No affiliate matches your search." :
          "No affiliates yet. Add the first one above — they get a unique AF number automatically.") +
        "</div>";
      return;
    }
    rows.forEach(function (a) { list.appendChild(affiliateDirectoryCard(a)); });
  }
  function affiliateDirectoryCard(a) {
    var card = document.createElement("div");
    card.className = "order-card";
    card.style.padding = "14px 16px";

    var top = document.createElement("div");
    top.style.display = "flex";
    top.style.justifyContent = "space-between";
    top.style.alignItems = "center";
    top.style.gap = "10px";
    top.style.flexWrap = "wrap";
    var title = document.createElement("strong");
    title.textContent = fmtAffiliateNo(a.affiliate_no) + " · " + (a.name || "—");
    top.appendChild(title);
    var link = waLinkOf(a.whatsapp);
    if (link) {
      var wa = document.createElement("a");
      wa.className = "badge b-done";
      wa.href = link;
      wa.target = "_blank";
      wa.rel = "noopener";
      wa.style.textDecoration = "none";
      wa.textContent = "💬 WhatsApp";
      top.appendChild(wa);
    }
    card.appendChild(top);

    var nameIn = document.createElement("input");
    nameIn.type = "text";
    nameIn.value = a.name || "";
    nameIn.placeholder = "Name…";
    var waIn = document.createElement("input");
    waIn.type = "text";
    waIn.value = a.whatsapp || "";
    waIn.placeholder = "WhatsApp number…";
    [nameIn, waIn].forEach(function (inp) {
      inp.style.cssText = "width:100%;padding:9px 11px;border:1.5px solid #e3e9f7;border-radius:9px;font-size:.92rem;margin-top:10px;background:#fff;color:var(--ink)";
    });
    var bankIn = document.createElement("textarea");
    bankIn.rows = 2;
    bankIn.value = a.bank_details || "";
    bankIn.placeholder = "Bank / payment details…";
    bankIn.style.cssText = "width:100%;padding:9px 11px;border:1.5px solid #e3e9f7;border-radius:9px;font-size:.92rem;margin-top:10px;background:#fff;color:var(--ink);font-family:inherit";
    card.appendChild(nameIn);
    card.appendChild(waIn);
    card.appendChild(bankIn);

    var actions = document.createElement("div");
    actions.className = "oc-actions";
    var saveBtn = document.createElement("button");
    saveBtn.type = "button";
    saveBtn.className = "btn";
    saveBtn.textContent = "Save";
    saveBtn.addEventListener("click", function () {
      var patch = {
        name: nameIn.value.trim(),
        whatsapp: waIn.value.trim() || null,
        bank_details: bankIn.value.trim() || null,
        updated_at: new Date().toISOString()
      };
      if (!patch.name) { setAfdMsg('<div class="alert error">Name is required.</div>'); return; }
      sb.from("affiliates").update(patch).eq("affiliate_no", a.affiliate_no)
        .then(function (res) {
          if (res.error) { setAfdMsg('<div class="alert error">Save failed: ' + esc(res.error.message) + "</div>"); return; }
          Object.keys(patch).forEach(function (k) { a[k] = patch[k]; });
          setAfdMsg('<div class="alert ok">' + fmtAffiliateNo(a.affiliate_no) + " saved.</div>");
          paintAffiliateDirectory();
          setTimeout(function () { setAfdMsg(""); }, 2000);
        });
    });
    var delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "btn btn-reject";
    delBtn.textContent = "Delete";
    delBtn.addEventListener("click", function () {
      if (!window.confirm("Delete " + fmtAffiliateNo(a.affiliate_no) + " (" + (a.name || "") + ")? The AF number will not be reused.")) return;
      sb.from("affiliates").delete().eq("affiliate_no", a.affiliate_no)
        .then(function (res) {
          if (res.error) { setAfdMsg('<div class="alert error">Delete failed: ' + esc(res.error.message) + "</div>"); return; }
          affiliateDirectory = affiliateDirectory.filter(function (x) { return x.affiliate_no !== a.affiliate_no; });
          paintAffiliateDirectory();
        });
    });
    actions.appendChild(saveBtn);
    actions.appendChild(delBtn);
    card.appendChild(actions);
    return card;
  }
  function addAffiliateFromForm() {
    var name = ($("afd-name").value || "").trim();
    var whatsapp = ($("afd-whatsapp").value || "").trim();
    var bank = ($("afd-bank").value || "").trim();
    var customRaw = ($("afd-custom-no") && $("afd-custom-no").value || "").trim();
    if (!name) { setAfdMsg('<div class="alert error">Enter the affiliate\'s name first.</div>'); return; }
    var payload = { name: name, whatsapp: whatsapp || null, bank_details: bank || null };
    if (customRaw) {
      var customNo = Number(customRaw);
      if (!Number.isInteger(customNo) || customNo < 1) {
        setAfdMsg('<div class="alert error">Your AF number must be a whole number (1 or more).</div>');
        return;
      }
      if (affiliateDirectory.some(function (x) { return Number(x.affiliate_no) === customNo; })) {
        setAfdMsg('<div class="alert error">' + fmtAffiliateNo(customNo) + " is already taken — pick another number.</div>");
        return;
      }
      payload.affiliate_no = customNo; // admin-given ID; blank field = auto
    }
    sb.from("affiliates").insert(payload)
      .select("*")
      .then(function (res) {
        if (res.error) { setAfdMsg('<div class="alert error">Could not add: ' + esc(res.error.message) + "</div>"); return; }
        var row = (res.data || [])[0] || {};
        affiliateDirectory.push(row);
        affiliateDirectory.sort(function (a, b) { return Number(a.affiliate_no) - Number(b.affiliate_no); });
        $("afd-name").value = "";
        $("afd-whatsapp").value = "";
        $("afd-bank").value = "";
        if ($("afd-custom-no")) $("afd-custom-no").value = "";
        setAfdMsg('<div class="alert ok">Added ' + esc(name) + " as " + fmtAffiliateNo(row.affiliate_no) + ".</div>");
        paintAffiliateDirectory();
        setTimeout(function () { setAfdMsg(""); }, 3000);
      });
  }

  // ---- Init ----
  document.addEventListener("DOMContentLoaded", function () {
    $("login-btn").addEventListener("click", tryLogin);
    $("admin-pass").addEventListener("keydown", function (e) {
      if (e.key === "Enter") tryLogin();
    });
    var lb = $("logout-btn");
    if (lb) lb.addEventListener("click", logout);
    var afdAdd = $("afd-add");
    if (afdAdd) afdAdd.addEventListener("click", addAffiliateFromForm);
    var afdSearch = $("afd-search");
    if (afdSearch) afdSearch.addEventListener("input", paintAffiliateDirectory);
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
