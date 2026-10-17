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

  function renderOrders() {
    var rows = filteredOrders();
    $("orders-count").textContent = "(" + rows.length + " of " + allOrders.length + ")";
    var body = $("orders-body");
    body.innerHTML = "";
    if (!rows.length) {
      body.innerHTML = '<tr><td colspan="8" class="muted">No orders found.</td></tr>';
      return;
    }
    rows.forEach(function (o) {
      var tr = document.createElement("tr");
      var d = new Date(o.created_at);

      var tdOrder = document.createElement("td");
      tdOrder.innerHTML = "<strong>" + esc(o.order_code) + "</strong><br><span class='muted'>" + esc(d.toLocaleString()) + "</span>";

      var tdCust = document.createElement("td");
      tdCust.innerHTML = esc(o.customer_name || "—") + "<br><strong>" + esc(o.contact_number) + "</strong>";

      var tdSvc = document.createElement("td");
      tdSvc.innerHTML = esc(o.platform) + " · " + esc(o.service_type) + "<br>" + esc(o.quality) +
        "<br><a href='" + esc(o.profile_link) + "' target='_blank' rel='noopener'>link ↗</a>";

      var tdPrice = document.createElement("td");
      tdPrice.innerHTML = Number(o.quantity).toLocaleString() + "<br>" + fmtUSD(o.price_usd) + "<br>" + fmtPKR(o.price_pkr);

      var tdTid = document.createElement("td");
      tdTid.textContent = o.transaction_id;

      var tdStatus = document.createElement("td");
      var sel = document.createElement("select");
      ["pending", "processing", "completed", "cancelled"].forEach(function (s) {
        var opt = document.createElement("option");
        opt.value = s;
        opt.textContent = s.charAt(0).toUpperCase() + s.slice(1);
        if (o.status === s) opt.selected = true;
        sel.appendChild(opt);
      });
      sel.setAttribute("data-id", o.id);
      tdStatus.appendChild(sel);

      var tdNote = document.createElement("td");
      var note = document.createElement("input");
      note.type = "text";
      note.value = o.admin_note || "";
      note.placeholder = "note…";
      note.setAttribute("data-id", o.id);
      note.style.width = "120px";
      tdNote.appendChild(note);

      var tdSave = document.createElement("td");
      var saveBtn = document.createElement("button");
      saveBtn.type = "button";
      saveBtn.className = "btn";
      saveBtn.style.padding = "6px 12px";
      saveBtn.style.fontSize = ".85rem";
      saveBtn.textContent = "Save";
      saveBtn.addEventListener("click", function () {
        saveOrder(o.id, sel.value, note.value);
      });
      tdSave.appendChild(saveBtn);

      tr.appendChild(tdOrder); tr.appendChild(tdCust); tr.appendChild(tdSvc);
      tr.appendChild(tdPrice); tr.appendChild(tdTid); tr.appendChild(tdStatus);
      tr.appendChild(tdNote); tr.appendChild(tdSave);
      body.appendChild(tr);
    });
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
