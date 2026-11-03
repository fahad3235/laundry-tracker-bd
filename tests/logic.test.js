// Node unit tests for js/logic.js — run: node tests/logic.test.js
var assert = require("assert");
var L = require("../js/logic.js");
var passed = 0;
function check(name, fn) { fn(); passed++; console.log("ok - " + name); }

var b1 = { shop: "Dhaka Laundry", givenDate: "2026-11-01", pickupDate: "2026-11-03",
  items: { shirt: 3, pant: 2, panjabi: 0, bedsheet: 1, towel: 0, other: 0 }, costPaisa: 45000, status: "given", note: "" };
var b2 = { shop: "Clean Wash", givenDate: "2026-10-30", pickupDate: "2026-11-02",
  items: { shirt: 0, pant: 0, panjabi: 1, bedsheet: 0, towel: 2, other: 0 }, costPaisa: 20000, status: "ready", note: "" };
var b3 = { shop: "Old Shop", givenDate: "2026-10-20", pickupDate: "2026-10-22",
  items: { shirt: 1, pant: 1, panjabi: 0, bedsheet: 0, towel: 0, other: 0 }, costPaisa: 10000, status: "collected", note: "" };

check("totalItems sums categories", function () { assert.strictEqual(L.totalItems(b1), 6); assert.strictEqual(L.totalItems(b2), 3); });
check("overdue: past pickup + not collected", function () {
  assert.strictEqual(L.isOverdue(b2, "2026-11-03"), true);
  assert.strictEqual(L.isOverdue(b1, "2026-11-03"), false); // due today, not overdue
  assert.strictEqual(L.isOverdue(b3, "2026-11-03"), false); // collected
});
check("due today", function () { assert.strictEqual(L.isDueToday(b1, "2026-11-03"), true); assert.strictEqual(L.isDueToday(b2, "2026-11-03"), false); });
check("summarize at 2026-11-03", function () {
  var s = L.summarize([b1, b2, b3], "2026-11-03");
  assert.deepStrictEqual(s, { pending: 2, itemsInWash: 9, spentThisMonthPaisa: 45000, overdue: 1 });
  // spent counts only bundles GIVEN in Nov: b1 (Nov 1) yes; b2 (Oct 30) no; b3 (Oct 20) no
});
check("daysBetween", function () { assert.strictEqual(L.daysBetween("2026-11-02", "2026-11-03"), 1); assert.strictEqual(L.daysBetween("2026-11-03", "2026-11-02"), -1); });
check("validateBundle accepts valid, rejects each fault", function () {
  var good = { shop: "X", givenDate: "2026-11-03", pickupDate: "2026-11-05", items: { shirt: 1 }, cost: "120.50" };
  assert.deepStrictEqual(L.validateBundle(good), []);
  assert.ok(L.validateBundle(Object.assign({}, good, { shop: "  " })).indexOf("shop") >= 0);
  assert.ok(L.validateBundle(Object.assign({}, good, { pickupDate: "2026-11-02" })).indexOf("pickupBeforeGiven") >= 0);
  assert.ok(L.validateBundle(Object.assign({}, good, { items: {} })).indexOf("noItems") >= 0);
  assert.ok(L.validateBundle(Object.assign({}, good, { items: { shirt: -1 } })).indexOf("items") >= 0);
  assert.ok(L.validateBundle(Object.assign({}, good, { items: { shirt: 1.5 } })).indexOf("items") >= 0);
  assert.ok(L.validateBundle(Object.assign({}, good, { cost: "-5" })).indexOf("cost") >= 0);
  assert.ok(L.validateBundle(Object.assign({}, good, { cost: "abc" })).indexOf("cost") >= 0);
});
check("parseCostToPaisa", function () {
  assert.strictEqual(L.parseCostToPaisa("120.50"), 12050);
  assert.strictEqual(L.parseCostToPaisa("0"), 0);
  assert.strictEqual(L.parseCostToPaisa("10.005"), 1001); // rounds half-up via Math.round
  assert.strictEqual(L.parseCostToPaisa(""), null);
});
check("formatMoney", function () { assert.strictEqual(L.formatMoney(12050), "120.50"); assert.strictEqual(L.formatMoney(0), "0.00"); });
check("filterBundles: status + search", function () {
  assert.strictEqual(L.filterBundles([b1, b2, b3], "", "overdue", "2026-11-03").length, 1);
  assert.strictEqual(L.filterBundles([b1, b2, b3], "", "collected", "2026-11-03").length, 1);
  assert.strictEqual(L.filterBundles([b1, b2, b3], "clean", "all", "2026-11-03").length, 1);
  assert.strictEqual(L.filterBundles([b1, b2, b3], "nomatch", "all", "2026-11-03").length, 0);
});
check("validateImport accepts good export, rejects bad", function () {
  assert.strictEqual(L.validateImport({ app: "laundry-tracker-bd", bundles: [b1] }).length, 1);
  assert.strictEqual(L.validateImport({ app: "other-app", bundles: [] }), null);
  assert.strictEqual(L.validateImport({ app: "laundry-tracker-bd", bundles: [{ shop: "X" }] }), null);
  assert.strictEqual(L.validateImport({ app: "laundry-tracker-bd", bundles: [Object.assign({}, b1, { items: { shirt: -2 } })] }), null);
  assert.strictEqual(L.validateImport({ app: "laundry-tracker-bd", bundles: [Object.assign({}, b1, { items: {} })] }), null);
  assert.strictEqual(L.validateImport(null), null);
  assert.strictEqual(L.validateImport({ app: "laundry-tracker-bd", bundles: "nope" }), null);
});
check("normalizeBundle defaults status + clamps items", function () {
  var n = L.normalizeBundle({ id: "x", shop: " S ", givenDate: "2026-11-01", pickupDate: "2026-11-02", items: { shirt: 2.9 }, costPaisa: 5000 });
  assert.strictEqual(n.status, "given"); assert.strictEqual(n.items.shirt, 2); assert.strictEqual(n.shop, "S");
});
console.log(passed + " node unit tests passed");
