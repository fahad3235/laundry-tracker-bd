// Laundry Tracker BD — pure logic (browser + node). No DOM here.
(function (root) {
  var CATEGORIES = ["shirt", "pant", "panjabi", "bedsheet", "towel", "other"];
  var STATUSES = ["given", "ready", "collected"];

  function todayStr(d) {
    d = d || new Date();
    var y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"), day = String(d.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + day;
  }
  function isDateStr(s) { return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s + "T00:00:00Z")); }
  function daysBetween(a, b) { // b - a in whole days (YYYY-MM-DD strings)
    return Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86400000);
  }
  function totalItems(bundle) {
    var t = 0; CATEGORIES.forEach(function (c) { t += bundle.items[c] || 0; }); return t;
  }
  function isOverdue(bundle, today) {
    return bundle.status !== "collected" && isDateStr(bundle.pickupDate) && bundle.pickupDate < today;
  }
  function isDueToday(bundle, today) { return bundle.status !== "collected" && bundle.pickupDate === today; }
  function summarize(bundles, today) {
    var month = today.slice(0, 7), pending = 0, itemsInWash = 0, spent = 0, overdue = 0;
    bundles.forEach(function (b) {
      if (b.status !== "collected") { pending++; itemsInWash += totalItems(b); }
      if (isOverdue(b, today)) overdue++;
      if (b.givenDate.slice(0, 7) === month) spent += b.costPaisa || 0;
    });
    return { pending: pending, itemsInWash: itemsInWash, spentThisMonthPaisa: spent, overdue: overdue };
  }
  function filterBundles(bundles, query, filter, today) {
    var q = (query || "").trim().toLowerCase();
    return bundles.filter(function (b) {
      if (filter === "pending" && b.status === "collected") return false;
      if (filter === "ready" && b.status !== "ready") return false;
      if (filter === "overdue" && !isOverdue(b, today)) return false;
      if (filter === "collected" && b.status !== "collected") return false;
      if (q && (b.shop || "").toLowerCase().indexOf(q) < 0 && (b.note || "").toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
  }
  function parseCostToPaisa(raw) {
    if (raw === "" || raw === null || raw === undefined) return null;
    var n = Number(String(raw).trim());
    if (!isFinite(n) || n < 0) return null;
    return Math.round(n * 100);
  }
  function validateBundle(input) {
    var errors = [];
    if (!input.shop || !String(input.shop).trim()) errors.push("shop");
    if (!isDateStr(input.givenDate)) errors.push("givenDate");
    if (!isDateStr(input.pickupDate)) errors.push("pickupDate");
    if (isDateStr(input.givenDate) && isDateStr(input.pickupDate) && input.pickupDate < input.givenDate) errors.push("pickupBeforeGiven");
    var total = 0, badItem = false;
    CATEGORIES.forEach(function (c) {
      var v = input.items[c];
      if (v === undefined || v === null || v === "") v = 0;
      if (!Number.isInteger(Number(v)) || Number(v) < 0 || Number(v) > 999) badItem = true;
      total += Number(v) || 0;
    });
    if (badItem) errors.push("items");
    if (total === 0) errors.push("noItems");
    if (parseCostToPaisa(input.cost) === null) errors.push("cost");
    return errors;
  }
  function normalizeBundle(raw) {
    var items = {};
    CATEGORIES.forEach(function (c) { items[c] = Math.max(0, Math.floor(Number(raw.items && raw.items[c]) || 0)); });
    return {
      id: String(raw.id || ""),
      shop: String(raw.shop || "").trim(),
      givenDate: raw.givenDate, pickupDate: raw.pickupDate,
      items: items, costPaisa: Math.max(0, Math.floor(Number(raw.costPaisa) || 0)),
      status: STATUSES.indexOf(raw.status) >= 0 ? raw.status : "given",
      note: String(raw.note || "").trim()
    };
  }
  function validateImport(data) {
    if (!data || typeof data !== "object" || data.app !== "laundry-tracker-bd" || !Array.isArray(data.bundles)) return null;
    var out = [];
    for (var i = 0; i < data.bundles.length; i++) {
      var b = data.bundles[i];
      if (!b || typeof b !== "object" || !b.shop || !isDateStr(b.givenDate) || !isDateStr(b.pickupDate)) return null;
      if (!b.items || typeof b.items !== "object") return null;
      var total = 0, bad = false;
      CATEGORIES.forEach(function (c) {
        var v = b.items[c]; if (v !== undefined && (!Number.isInteger(v) || v < 0)) bad = true; total += v || 0;
      });
      if (bad || total === 0) return null;
      if (b.costPaisa !== undefined && (!Number.isInteger(b.costPaisa) || b.costPaisa < 0)) return null;
      out.push(normalizeBundle(b));
    }
    return out;
  }
  function formatMoney(paisa) { return (paisa / 100).toFixed(2); }

  var api = { CATEGORIES: CATEGORIES, STATUSES: STATUSES, todayStr: todayStr, isDateStr: isDateStr,
    daysBetween: daysBetween, totalItems: totalItems, isOverdue: isOverdue, isDueToday: isDueToday,
    summarize: summarize, filterBundles: filterBundles, parseCostToPaisa: parseCostToPaisa,
    validateBundle: validateBundle, normalizeBundle: normalizeBundle, validateImport: validateImport,
    formatMoney: formatMoney };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.LaundryLogic = api;
})(typeof window !== "undefined" ? window : globalThis);
