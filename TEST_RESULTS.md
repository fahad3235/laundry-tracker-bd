# TEST_RESULTS — Laundry Tracker BD (run 2026-11-03, 15:00 slot)

## Node unit tests — 11/11 passed (`node tests/logic.test.js`)

- totalItems: 3 shirts + 2 pants + 1 bedsheet = 6; panjabi/towel case = 3.
- Overdue: pickup 2026-11-02 + status ready + today 2026-11-03 → overdue;
  due-today bundle → not overdue; collected bundle → not overdue.
- Due today: pickup == today → true.
- Summarize at 2026-11-03 over 3 bundles: pending 2, items in wash 9,
  spent this month ৳450.00 (only the bundle GIVEN in November counts —
  Oct 30 and Oct 20 bundles excluded), overdue 1.
- daysBetween: +1 / −1 both exact.
- validateBundle: valid bundle passes; empty shop, pickup-before-given,
  zero items, negative/fractional item counts, negative/non-numeric cost
  each rejected with the right error code.
- parseCostToPaisa: "120.50" → 12050; "0" → 0; "10.005" → 1001 (rounds);
  "" → null.
- formatMoney: 12050 → "120.50"; 0 → "0.00".
- filterBundles: overdue → 1, collected → 1, search "clean" → 1,
  search "nomatch" → 0.
- validateImport: good export accepted (1 bundle); wrong app id, missing
  dates, negative items, zero-item bundle, null, non-array bundles → null.
- normalizeBundle: unknown status defaults to "given", 2.9 shirts → 2,
  shop name trimmed.

## Headless-Chrome smoke — 17/17 passed (`node tests/smoke.mjs`)

Stock headless_shell via raw CDP, page `file://…/index.html?asof=2026-11-03`,
0 console/page errors throughout:

- DevTools endpoint up, target created, title + h1 "Laundry Tracker BD",
  4 stat boxes, empty state shown.
- Add bundle (Dhaka Laundry, given 2026-11-01, pickup 2026-11-03, 3 shirts +
  2 pants, ৳450) → 1 card, card shows shop + 5 items, dashboard
  pending = 1 / items = 5, "Due today" badge at the as-of date.
- Reload → card persists (localStorage).
- বাংলা toggle → dashboard heading becomes "ড্যাশবোর্ড", pending stat
  renders "১" (Bengali digit).
- Empty-shop submit → inline error, no card created.
- 390px viewport → no horizontal overflow (scrollWidth ≤ 390).

## Repairs during the run

- 1 test-side fix only: the unit-test summary line hardcoded "/13" while
  the file has 11 checks — corrected to print the real count. 0 app bugs.
