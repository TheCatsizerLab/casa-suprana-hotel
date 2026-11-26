# Casa Suprana

An independent fictional hotel concept by TheCatsizerLab: 18 rooms, five languages,
autonomous room, table and activity booking, local hotel administration and a server-side Beds24 integration boundary.

**Live:** https://thecatsizerlab.github.io/casa-suprana-hotel/

FR is the original root. EN, IT, ES and DE use `/en/`, `/it/`, `/es/` and `/de/`.
The administration is `administration/` within each language. It is a browser-local
demonstration, not an authenticated production PMS. No stay, payment or email is real.

## Run and build

Node 22+ is sufficient for the build and domain/adapter tests. No npm installation
or runtime dependency is required.

```
npm run build
npm test
npm run preview
```

Open `http://127.0.0.1:8771/casa-suprana-hotel/`. The Python preview server restricts
serving to this project and its intended GitHub Pages prefix. Do not use `file://`.

## Shared implementation

- `content/*.tsv`: reviewed FR / EN / IT / ES / DE messages with semantic keys.
- `tools/build.mjs`: generates 120 complete HTML pages, five compact catalogs and metadata.
- `src/views.js`, `assets/site.css`: shared presentation and responsive visual system.
- `src/core/`: integer-cent prices, capacity, physical-unit inventory and booking rules.
- `src/core/store.js`: IndexedDB transactions serialize writes across connections/tabs.
- `src/providers/local.js`: fully functional default provider, never calls an external API.
- `src/providers/beds24.js`: browser contract for the owner's authenticated same-origin gateway.
- `server/`: server-only API V2 transport and policy-based provider. Never imported by the public app.
- `integrations/wordpress-existing/`: unchanged original WordPress availability connector.
- `assets/images/manifest.json`: photograph source, author, licence, variants and localized alt text.

## Booking and administration

Four room categories contain 6 + 6 + 4 + 2 physical rooms. A room must be free for
the **whole stay**; availability is not approximated by separate nightly totals.
Occupancy, seasonal prices, weekend uplifts, rate overrides, minimum stays, flexible
and non-refundable plans, promotions, extras and the simulated local tax are priced
in integer cents. The total is rechecked in the same transaction that assigns a room.

The flexible rate can be changed until three days before arrival; cancellation is
free until that cutoff and then costs the first undiscounted room night. The advance
rate discounts accommodation by 8% and is not changeable or refundable, including
extras and tax. All payment/refund amounts are simulations. Declined payment creates
no booking. Confirmed quotes are snapshots and retain their price when rates change.

Administration manages bookings, the availability calendar, arrivals/departures,
closures, rate periods, extras, offer parameters and the main copy for each language.
Reset affects only the `avelune-hotel-demo` database. Unknown/new user-authored copy
is not machine-translated. It stays in the language version being edited.

## Validation and documentation

`tests/browser.py` uses isolated Python Playwright browsers and the sibling
`municipal-tooling/node_modules/axe-core` QA tool. Python Playwright, Pillow and
Beautiful Soup are QA-only tools. `tools/capture.py` creates real interface captures;
it never paints translated text over an image.

- [Current verification report — editorial redesign](docs/atelier-verification.html)
- [Initial delivery and historical measurements](docs/verification.html)
- [Beds24 connection procedure and exact limits](docs/beds24.html)
- [Five independently verified award references](docs/design-references.md)
- [Photo sources](assets/images/manifest.json)
- [Created files](docs/file-list.txt)

## Deployment

Public GitHub Pages, branch `main`, folder `/`, with `.nojekyll`. Rebuild after source
or translation edits, run the checks and push the generated HTML with the source.
The `/casa-suprana-hotel/` prefix is configured in `src/config.js`.

No backend, API key, remote font, payment provider, paid service or recurring charge
is needed for the public demo. Connecting a real PMS requires the separate owner's
server and the production work described in the Beds24 guide. No existing Beds24
account was modified by this delivery. Original projects, images and video URLs in
the portfolio remain available.


## Restaurant and activities

La Table has three menus, adult/child prices and six physical tables (24 seats).
Reservations occupy a suitable table for 90 minutes; overlapping sittings and
closures are checked in the confirmation transaction. No deposit is taken.
Three activities have their own session times, prices and capacities. Trial
payment can be declined without consuming places. Tables and activities have
separate CS-T / CS-A references and can be changed/cancelled in My booking before
their time. Activity refunds are simulated; table menu amounts are estimates.
Administration controls menu prices/activation, restaurant closures, activity
prices/capacities and date/session exceptions. Existing bookings retain their quote.
These services are autonomous local modules; they are not represented as live
Beds24 restaurant or excursion integrations.

The internal IndexedDB identifier `avelune-hotel-demo` is deliberately retained
from the early preview so that renaming the hotel does not erase existing trials.
The public identity, routes, repository and all five language versions are Casa Suprana.

## Editorial redesign — 26 November 2026

`src/atelier-home.js` composes the original island journal, `src/atelier-art.js`
contains original botanical/compass/wave drawings, and `assets/atelier.css`
provides the shared presentation. The local providers and booking rules remain
unchanged. `src/atelier.js` only reveals editorial sections and respects reduced
motion; ambient drawing animations last less than five seconds and do not loop.
There is no WebGL, scroll hijacking, external animation library or image zoom.
New island photos and their exact locations/licences are in the image manifest.

The five-language portfolio retains its existing URLs and uses the 55 refreshed
interface captures. See the dated report for current results, rather than treating
the initial delivery’s Lighthouse measurements as measurements of this redesign.
