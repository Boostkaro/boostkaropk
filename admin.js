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
    details.appendChild(kv("Link", "<a href='" + esc(o.profile_link) + "' target='_blank' rel='noopener'>" + esc(o.profile_link) + " ↗</a>"));
    details.appendChild(kv("Quantity", Number(o.quantity).toLocaleString()));
    details.appendChild(kv("Price", fmtUSD(o.price_usd) + " · " + fmtPKR(o.price_pkr)));
    details.appendChild(kv("Customer", esc(o.customer_name || "—") + " · " + esc(o.contact_number)));
    details.appendChild(kv("TID", esc(o.transaction_id || "—")));

    // Provider bridge info (columns exist after the one-time bridge SQL;
    // absent on older rows, so this simply renders nothing until then).
    if (o.provider_order_id) {
      details.appendChild(kv("Provider", "#" + esc(o.provider_order_id) +
        (o.provider_status ? " · " + esc(o.provider_status) : "")));
    }

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
