# Video Store

Sells OKHub's technology/ecommerce videos: a catalog of products, each with
one or more purchasable editions (tier + price), Paystack checkout, and
gated post-payment delivery (instant download link or emailed link).

This is a **separate, independently deployed service** from okhubtech.com.
That site is a static HTML export with no server at all (see
`../../docs/deployment.md`) — there is nowhere on it to run a checkout, a
webhook, or a database. This service deploys as a **Cloudflare Worker**
(via `@opennextjs/cloudflare`, backed by Cloudflare D1), and okhubtech.com
only ever links out to it (see "Wiring it to the main site" below).

## How a purchase works

1. A buyer picks a video, an edition (variant), and a delivery method on
   `/videos/[slug]`.
2. `POST /api/checkout` looks up the variant's price **from the database**
   (never trusts a client-submitted amount — see
   `lib/checkout.ts#computeOrderAmountKobo`), creates a `PENDING` order, asks
   Paystack for a hosted checkout page, and redirects the browser there.
3. The buyer pays on Paystack's own page. Paystack then does two things,
   independently:
   - **Redirects the browser** to `/checkout/success?reference=...`.
   - **POSTs a webhook** to `/api/webhooks/paystack`.
4. Both paths call the same function, `lib/fulfillment.ts#fulfillOrder`,
   which re-verifies the payment directly against Paystack's API (never
   trusts the webhook payload or the redirect alone), checks the amount
   actually collected matches what was asked for, marks the order `PAID`,
   and creates a `DeliveryGrant` — a random token good for a limited number
   of uses within a time window.
5. `GET /download/[token]` is the only thing that ever resolves that grant
   to the real asset: a signed, expiring Cloudinary URL, or an external link
   (Drive/Dropbox). The buyer never sees the raw asset location before
   paying.

`fulfillOrder` is idempotent — whichever of the redirect or the webhook
lands first does the work; the other is a no-op that just returns the same
result. See the tests in `tests/` for the properties this all leans on:
webhook signature verification, grant expiry/use-count rules, and the
"server decides the price, not the client" contract.

## Why Cloudflare Workers, and what that constrains

Workers is an edge V8-isolate runtime, not a persistent Node server: no
local filesystem, no raw TCP sockets. Two real consequences, both already
handled, worth knowing if you're changing anything here:

- **Database is Cloudflare D1**, not a SQLite file — reached through a
  binding (`wrangler.jsonc`'s `d1_databases`), not a `DATABASE_URL`
  connection string. `lib/prisma.ts` constructs a fresh `PrismaClient` per
  request from `getCloudflareContext().env.DB`, since there's no persistent
  process to hold a singleton client on between requests.
- **Email is Resend's HTTP API**, not SMTP — `lib/mailer.ts`. Nodemailer's
  SMTP transport needs raw sockets Workers doesn't provide.

**Prisma is pinned to 6.19.3, not the current 7.x.** Prisma 7 shipped a new
WASM-based query compiler that does runtime `WebAssembly.compile()`, which
Workers blocks outright (`CompileError: WebAssembly.Module(): Wasm code
generation disallowed by embedder`) — a confirmed upstream regression,
[prisma/prisma#28657](https://github.com/prisma/prisma/issues/28657), with
6.19.x the last version documented to work here. The generator itself also
matters: `prisma-client-js` (the old default) still tries to load a native
query-engine binary at runtime even with the D1 adapter configured and
fails with an OpenSSL-target mismatch; `prisma-client` with
`runtime = "cloudflare"` (see `prisma/schema.prisma`) is what actually
avoids that. Check that GitHub issue before ever bumping past this — if
Prisma fixes the WASM problem, the schema's generator block and the pinned
versions in `package.json` both need to move together, not just one.

## Local setup

Two ways to run this locally, and they need different env files:

**Plain `next dev`** (fast iteration, D1 access via local emulation through
`initOpenNextCloudflareForDev()` in `next.config.ts`):

```bash
npm install
cp .env.example .env       # fill in real values — see below
npm run cf:types            # generates worker-configuration.d.ts from wrangler.jsonc
npm run d1:migrations:apply:local
npm run dev                 # http://localhost:4100
```

**The real Workers runtime** (`wrangler dev`, via OpenNext — closer to
production, what actually caught the Prisma/WASM issues above):

```bash
cp .env.example .dev.vars   # same values, different file — Wrangler reads
                             # .dev.vars, Next's own env loading reads .env
npm run d1:migrations:apply:local
npm run cf:preview          # builds, then serves on http://localhost:8787
```

Either way, run `npm run d1:migrations:apply:local` at least once first —
both dev modes read from the same local D1 emulation
(`.wrangler/state/v3/d1`), so the schema only needs applying once regardless
of which one you use. `npm run seed:demo` adds one sample product straight
into that same local D1 database via raw SQL (see "Database (Cloudflare
D1)" below for why it's SQL and not a Prisma script).

Run `npm test` any time — it's offline and takes well under a second (55
gate tests, no network, no database).

### Environment variables

See `.env.example` for the full list with inline notes. The ones that need
a real account rather than a placeholder:

- **`PAYSTACK_SECRET_KEY`** — Paystack dashboard → Settings → API Keys &
  Webhooks. Use a `sk_test_...` key while developing. This service uses the
  redirect/hosted-checkout flow, so no public key or Paystack.js is needed
  anywhere.
- **`CLOUDINARY_*`** — the same Cloudinary account okhubtech.com already
  uses for media. Only needed for variants that deliver through Cloudinary
  (see "Adding a video" below) — a variant using an external link doesn't
  need it, but the env schema (`lib/env.ts`) requires all three vars to be
  set regardless, since most catalogs will use both.
- **`RESEND_API_KEY`** / **`EMAIL_FROM`** — needed for the "email it to me"
  delivery method. [resend.com](https://resend.com) has a free tier.
- **`ADMIN_EMAIL`** / **`ADMIN_PASSWORD`** / **`ADMIN_SESSION_SECRET`** —
  one operator account, no user table. Generate the session secret with
  `openssl rand -hex 32`.

`lib/env.ts` validates these independently by feature area (core, Paystack,
Cloudinary, Resend, admin, delivery) rather than as one all-or-nothing
schema — logging into `/admin` only ever needs the `ADMIN_*` group, so an
empty Cloudinary/Resend/Paystack config doesn't block it. Each group throws
a specific, readable error naming exactly which variable is missing or
malformed, scoped to the feature actually being used.

**A `#` (or other dotenv-special character) in a value must be quoted** —
`ADMIN_PASSWORD="correct-horse-battery-#staple"`, not bare. An unquoted `#`
gets read as an inline comment by both Wrangler's `.dev.vars` parser and
Next's own `.env` loading, silently truncating the value — this is exactly
what broke admin login the first time through (login returned a clean 401,
not an error pointing at the real cause), and it's very easy to hit again
with a freshly generated password.

## Database (Cloudflare D1)

Two separate SQLite databases exist in this project, on purpose:

- **`prisma/dev.db`** (or whatever `DATABASE_URL` in `.env` points at) —
  local-only, used solely by Prisma CLI commands (`prisma generate`,
  `prisma migrate dev`) to author new migration SQL when the schema
  changes. Never deployed anywhere.
- **Cloudflare D1** — what the actual app reads and writes, everywhere
  (local emulation via `wrangler dev`, and the real thing once deployed).

They're kept in sync by hand, not by tooling, because D1 doesn't support
Prisma's own migrate engine (no shadow-database support over a binding):

1. Edit `prisma/schema.prisma`.
2. `DATABASE_URL="file:./prisma/dev.db" npx prisma migrate dev --name <change>`
   — generates `prisma/migrations/<timestamp>_<change>/migration.sql`
   against the throwaway local file.
3. Copy that SQL into a new file under `migrations/` (Wrangler's own D1
   migration directory, flat-numbered files — not the same directory or
   format as `prisma/migrations/`): `npm run d1:migrations:create -- <change>`
   scaffolds the numbered filename, then paste the SQL in.
4. `npm run d1:migrations:apply:local` (dev) or `:remote` (production).

`migrations/0001_init.sql` has a fuller comment on this same split.

## Adding a video to sell

Go to `/admin` (prompts for the `ADMIN_EMAIL`/`ADMIN_PASSWORD` from your
env), create a product, then add one or more editions under it. For each
edition, set a price and exactly one deliverable:

- **Cloudinary asset** (recommended): upload the video to Cloudinary
  first — Media Library or the API, this app does not upload video files
  itself — then, on that asset, set **Access control → Authenticated** (not
  the default public delivery type). Paste its public ID into the edition
  form. At download time, `lib/cloudinary.ts#signedAssetUrl` generates a URL
  signed with your `CLOUDINARY_API_SECRET` that expires in 5 minutes —
  that's what makes the "authenticated" delivery type matter: a public-type
  asset's public ID is just a permanent, guessable URL with no expiry.
- **External link**: an existing Google Drive / Dropbox share link. Simpler,
  but the link itself doesn't expire — only access to `/download/[token]`
  does. Good enough for most catalogs; Cloudinary is the tighter option
  when the content is worth protecting more carefully.

Deleting a product or edition is blocked once it has real orders against it
(the admin API returns 409) — deactivate it instead. That's deliberate: an
order's `productTitle`/`variantName`/`amountKobo` are snapshotted at
purchase time specifically so a later catalog edit never rewrites what a
past buyer's receipt says they bought, and a delete would leave that
snapshot pointing at nothing.

## Deploying

### First-time setup

```bash
npx wrangler login
npx wrangler d1 create video-store
```

The second command prints a `database_id` — put it into `wrangler.jsonc`'s
`d1_databases[0].database_id`, replacing the `REPLACE_WITH_REAL_D1_DATABASE_ID`
placeholder. Then apply the schema to the real database:

```bash
npm run d1:migrations:apply:remote
```

Set every secret from `.env.example` on the actual Worker (repeat per
variable — there's no bulk-upload command):

```bash
npx wrangler secret put PAYSTACK_SECRET_KEY
npx wrangler secret put CLOUDINARY_API_SECRET
# ...and so on for every value in .env.example
```

**`wrangler.jsonc`'s `name` must match the Worker name already configured
on the Cloudflare dashboard for this project** (confirmed by a build log
showing `Worker Name: okhubtech` — that's the value both `name` and the
`WORKER_SELF_REFERENCE` service binding use here). If that Worker is ever
renamed, both places in `wrangler.jsonc` have to change together — a
mismatch there is exactly what broke the first deploy attempt: the
interactive `@opennextjs/cloudflare migrate` wizard set `name` to the
Cloudflare project's name but the self-reference binding to a different
value derived from `package.json`, and the deploy failed with `Service
binding 'WORKER_SELF_REFERENCE' references Worker 'video-store' which was
not found`. (That binding is optional and this app doesn't actually hit the
code paths that need it — a revalidation edge case, a queue fallback — but
it's cheap to keep correct since it's declared either way.)

### Deploy

```bash
npm run cf:deploy
```

Then in the Paystack dashboard, register
`https://<your-worker-domain>/api/webhooks/paystack` under Settings → API
Keys & Webhooks.

### Why not the same cPanel hosting as okhubtech.com

That host serves static files only — no Node process can run there at all
(see `../../docs/deployment.md`).

## Wiring it to the main site

okhubtech.com's `components/ECommerceSection.tsx` links out to this
service rather than embedding a catalog of its own — the static export
has no way to show live prices or run a checkout. Point
`NEXT_PUBLIC_VIDEO_STORE_URL` (in the main repo's `.env`) at wherever this
service ends up deployed (e.g. `https://store.okhubtech.com`); until that's
set, the section links to `/contact` instead of a placeholder URL.

## Before this goes live with real money

- [ ] Swap `PAYSTACK_SECRET_KEY` from `sk_test_...` to the live key
      (`wrangler secret put PAYSTACK_SECRET_KEY` again), and register the
      **live** webhook URL in the Paystack dashboard (test and live mode
      have separate webhook registrations).
- [ ] Run one real end-to-end purchase in Paystack **test mode** first —
      card checkout, webhook delivery, and the download link all actually
      landing — before flipping to live keys. `fulfillOrder`'s
      already-paid/amount-mismatch/not-successful branches are covered by
      unit tests on their component logic (signature verification, grant
      expiry, price computation), and the full stack (checkout validation,
      admin CRUD against real D1, webhook signature accept/reject, the
      download gate's expiry/use-count enforcement, the already-paid
      success-page path) has been exercised by hand against
      `wrangler dev`'s local D1 emulation — but not yet against a real
      Paystack test-mode transaction landing on the deployed Worker.
- [ ] Confirm the Cloudinary assets you intend to sell are set to
      **Authenticated** delivery, not public — a public asset's "signed" URL
      still leaks the permanent public one alongside it.
- [ ] Set every real secret via `wrangler secret put` (not just `.dev.vars`
      locally), including a freshly generated `ADMIN_SESSION_SECRET` —
      don't reuse a dev one, and remember to quote any value containing `#`
      or other dotenv-special characters (see "Environment variables"
      above).

## Project layout

```
app/
  page.tsx                    storefront index
  videos/[slug]/               product detail + checkout form
  checkout/success/            fulfillment fallback + receipt
  download/[token]/route.ts    the one gate to the real asset
  admin/                       login + product/order management (own auth, own layout)
  api/                         checkout, webhook, product JSON, admin CRUD
lib/                           all business logic — see each file's header comment
prisma/schema.prisma           schema (see the note there on why no enums, and the
                                Prisma-version/generator pin for Cloudflare Workers)
migrations/                    Wrangler's own D1 migration files (see "Database" above)
wrangler.jsonc                 Worker config: D1 binding, name, compatibility flags
open-next.config.ts            @opennextjs/cloudflare build config
tests/                         55 offline gate tests, node:test + node:assert, zero deps
```
