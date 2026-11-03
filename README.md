# Laundry Tracker BD

A free, fully offline, bilingual (English / বাংলা) laundry-bundle tracker for
Bangladeshi students, mess residents, and families who hand clothes to a local
laundry shop and want to know exactly what is out, when it is due back, and
what it cost.

## Problem

Hostel and mess residents hand bundles of clothes to neighbourhood laundry
shops and track them in notebooks or memory: how many shirts went out, which
shop has them, when to collect, and how much was paid. Bundles get forgotten,
pickup dates slip, and monthly laundry spending is invisible.

## Features

1. **Dashboard** — pending bundles, items currently in wash, money spent this
   month, and overdue pickups at a glance.
2. **Bundle tracking** — shop name, date given, expected pickup date, item
   counts (shirt, pant, panjabi, bedsheet, towel, other), total cost, note.
3. **Status flow** — Given → Ready → Collected, with one-click transitions,
   plus overdue and due-today badges.
4. **Search & filters** — search by shop or note; filter All / Pending /
   Ready / Overdue / Collected.
5. **Data portability** — JSON export, strict-validated import (malformed
   files are rejected with data intact), typed-DELETE erase-all.
6. **Bilingual UI** — EN / বাংলা toggle persisted in localStorage, with
   Bengali digit rendering.
7. **Fully offline** — zero network requests; all data stays in the browser's
   localStorage.

## Stack

Vanilla HTML + CSS + JavaScript. No frameworks, no build step, no backend.
Pure logic lives in `js/logic.js` (shared by the browser app and the Node
unit tests); strings live in `js/i18n.js`; DOM code lives in `js/app.js`.

## Prerequisites

Any modern browser. For tests: Node.js 18+ (Node 22 for the smoke test's
built-in WebSocket client) and a headless Chromium binary.

## Install / run locally

```sh
# just open the file — no server needed
open index.html
# or serve it
npx serve .
```

## Dev commands

```sh
node tests/logic.test.js   # 11 Node unit tests
node tests/smoke.mjs       # 17 headless-Chrome smoke checks (stock headless_shell)
```

The smoke test loads `index.html?asof=2026-11-03` so date badges are
deterministic, and exercises add → dashboard → due-today badge → reload
persistence → BN toggle + Bengali digits → validation → 390px mobile.

## Environment

None. No API keys, no secrets, no configuration.

## Testing

See `TEST_RESULTS.md` for the hand-verified scenarios and the full results of
the 2026-11-03 run: 11/11 unit + 17/17 smoke, 0 console/page errors.

## Deployment

Static site — GitHub Pages (main branch, root). Open `index.html` from any
static host.

## Limitations

- Data lives in one browser's localStorage; clearing site data erases it.
  Export JSON regularly for backup.
- "Spent this month" counts bundles by their *given* date, not payment date.
- No reminders/notifications: overdue is shown as a badge when you open the
  app, not pushed to you.
- Costs are whatever you type; the app ships with no prices and no shop data.
- Personal organizer only — not affiliated with any laundry service.

## Status

MVP complete and verified 2026-11-03. Public demo, not a commercial product.
