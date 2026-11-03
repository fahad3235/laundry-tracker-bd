// Laundry Tracker BD — DOM app. Depends on LaundryLogic + LaundryI18n.
(function () {
  "use strict";
  var L = window.LaundryLogic, I18N = window.LaundryI18n;
  var KEY = "laundry-tracker-bd-v1", LANG_KEY = "laundry-tracker-bd-lang";
  var bundles = load(), lang = localStorage.getItem(LANG_KEY) || "en";
  var filter = "all", query = "";
  var BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

  function load() {
    try { var d = JSON.parse(localStorage.getItem(KEY) || "null"); return d && Array.isArray(d.bundles) ? d.bundles : []; }
    catch (e) { return []; }
  }
  function save() { localStorage.setItem(KEY, JSON.stringify({ app: "laundry-tracker-bd", bundles: bundles })); }
  function t(k) { return (I18N[lang] && I18N[lang][k]) || I18N.en[k] || k; }
  function digits(s) {
    s = String(s);
    return lang === "bn" ? s.replace(/[0-9]/g, function (d) { return BN_DIGITS[+d]; }) : s;
  }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function today() {
    var p = new URLSearchParams(location.search).get("asof");
    return p && L.isDateStr(p) ? p : L.todayStr();
  }
  function $ (id) { return document.getElementById(id); }

  function renderLang() {
    document.querySelectorAll("[data-i18n]").forEach(function (el) { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll("[data-i18n-ph]").forEach(function (el) { el.placeholder = t(el.dataset.i18nPh); });
    $("langBtn").textContent = lang === "en" ? "বাংলা" : "English";
    document.documentElement.lang = lang === "bn" ? "bn" : "en";
  }
  function itemSummary(b) {
    return L.CATEGORIES.filter(function (c) { return b.items[c] > 0; })
      .map(function (c) { return digits(b.items[c]) + " " + t(c); }).join(" · ");
  }
  function render() {
    var td = today(), sum = L.summarize(bundles, td);
    $("statPending").textContent = digits(sum.pending);
    $("statItems").textContent = digits(sum.itemsInWash);
    $("statSpent").textContent = digits(L.formatMoney(sum.spentThisMonthPaisa));
    $("statOverdue").textContent = digits(sum.overdue);
    var list = L.filterBundles(bundles, query, filter, td);
    var wrap = $("bundleList");
    if (!list.length) {
      wrap.innerHTML = '<p class="empty">' + esc(bundles.length ? t("emptyFilter") : t("empty")) + "</p>";
      return;
    }
    wrap.innerHTML = list.map(function (b) {
      var badge = "";
      if (L.isOverdue(b, td)) badge = '<span class="badge overdue">' + esc(t("overdueBadge")) + " (" + digits(Math.abs(L.daysBetween(b.pickupDate, td))) + "d)</span>";
      else if (L.isDueToday(b, td)) badge = '<span class="badge due">' + esc(t("dueToday")) + "</span>";
      var actions = "";
      if (b.status === "given") actions += '<button data-act="ready" data-id="' + esc(b.id) + '">' + esc(t("markReady")) + "</button>";
      if (b.status !== "collected") actions += '<button data-act="collect" data-id="' + esc(b.id) + '">' + esc(t("markCollected")) + "</button>";
      actions += '<button class="danger" data-act="delete" data-id="' + esc(b.id) + '">' + esc(t("del")) + "</button>";
      return '<article class="card" data-id="' + esc(b.id) + '"><div class="card-top"><h3>' + esc(b.shop) + '</h3>' +
        '<span class="status ' + esc(b.status) + '">' + esc(t(b.status)) + "</span></div>" +
        '<p class="items">' + esc(itemSummary(b)) + " — " + digits(L.totalItems(b)) + " " + esc(t("items")) + "</p>" +
        '<p class="meta">' + esc(t("givenOn")) + ": " + esc(b.givenDate) + " · " + esc(t("pickupOn")) + ": " + esc(b.pickupDate) +
        " · " + esc(t("costLbl")) + ": ৳" + digits(L.formatMoney(b.costPaisa)) + "</p>" +
        (b.note ? '<p class="note">' + esc(b.note) + "</p>" : "") + badge +
        '<div class="actions">' + actions + "</div></article>";
    }).join("");
  }
  function showMsg(msg, isErr) {
    var el = $("formMsg"); el.textContent = msg; el.className = "msg " + (isErr ? "err" : "ok");
  }
  function buildItemInputs() {
    $("itemGrid").innerHTML = L.CATEGORIES.map(function (c) {
      return '<label>' + esc(t(c)) + '<input type="number" min="0" max="999" step="1" value="0" data-cat="' + c + '"></label>';
    }).join("");
  }
  function init() {
    buildItemInputs();
    renderLang();
    $("givenDate").value = today();
    $("pickupDate").value = today();
    $("langBtn").addEventListener("click", function () {
      lang = lang === "en" ? "bn" : "en"; localStorage.setItem(LANG_KEY, lang);
      buildItemInputs(); renderLang(); render();
    });
    $("search").addEventListener("input", function (e) { query = e.target.value; render(); });
    document.querySelectorAll("[data-filter]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        filter = btn.dataset.filter;
        document.querySelectorAll("[data-filter]").forEach(function (b) { b.classList.toggle("active", b === btn); });
        render();
      });
    });
    $("bundleForm").addEventListener("submit", function (e) {
      e.preventDefault();
      var items = {};
      document.querySelectorAll("#itemGrid input").forEach(function (inp) { items[inp.dataset.cat] = inp.value === "" ? 0 : Number(inp.value); });
      var input = { shop: $("shop").value, givenDate: $("givenDate").value, pickupDate: $("pickupDate").value, items: items, cost: $("cost").value };
      var errs = L.validateBundle(input);
      if (errs.length) {
        var map = { shop: "errShop", givenDate: "errDates", pickupDate: "errDates", pickupBeforeGiven: "errPickupBefore", items: "errItems", noItems: "errNoItems", cost: "errCost" };
        showMsg(t(map[errs[0]] || "errDates"), true); return;
      }
      bundles.unshift(L.normalizeBundle({ id: "b" + Date.now() + Math.floor(Math.random() * 1000),
        shop: input.shop, givenDate: input.givenDate, pickupDate: input.pickupDate, items: items,
        costPaisa: L.parseCostToPaisa(input.cost), status: "given", note: $("note").value }));
      save(); e.target.reset(); buildItemInputs(); $("givenDate").value = today(); $("pickupDate").value = today();
      showMsg(t("save") + " ✓", false); render();
    });
    $("bundleList").addEventListener("click", function (e) {
      var btn = e.target.closest("button[data-act]"); if (!btn) return;
      var b = bundles.find(function (x) { return x.id === btn.dataset.id; }); if (!b) return;
      if (btn.dataset.act === "ready") b.status = "ready";
      else if (btn.dataset.act === "collect") b.status = "collected";
      else if (btn.dataset.act === "delete") bundles = bundles.filter(function (x) { return x !== b; });
      save(); render();
    });
    $("exportBtn").addEventListener("click", function () {
      var blob = new Blob([JSON.stringify({ app: "laundry-tracker-bd", bundles: bundles }, null, 2)], { type: "application/json" });
      var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "laundry-tracker-bd.json"; a.click();
    });
    $("importFile").addEventListener("change", function (e) {
      var f = e.target.files[0]; if (!f) return;
      var r = new FileReader();
      r.onload = function () {
        try {
          var data = L.validateImport(JSON.parse(r.result));
          if (!data) { showMsg(t("errImport"), true); return; }
          bundles = data; save(); showMsg(t("importOk"), false); render();
        } catch (err) { showMsg(t("errImport"), true); }
      };
      r.readAsText(f); e.target.value = "";
    });
    $("eraseBtn").addEventListener("click", function () {
      if (prompt(t("eraseConfirm")) !== "DELETE") return;
      if (!confirm(t("confirmErase"))) return;
      bundles = []; save(); showMsg(t("eraseOk"), false); render();
    });
    render();
  }
  document.addEventListener("DOMContentLoaded", init);
})();
