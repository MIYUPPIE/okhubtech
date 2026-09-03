# Video Store

Sells OKHub's technology/ecommerce videos: a catalog of products, each with
one or more purchasable editions (tier + price), Paystack checkout, and
gated post-payment delivery (instant download link or emailed link).

This is a **separate, independently deployed service** from okhubtech.com.
That site is a static HTML export with no server at all (see
`../../docs/deployment.md`) — there is nowhere on it to run a checkout, a
webhook, or a database. This service runs as a real Node process on its own
host, and okhubtech.com only ever links out to it (see "Wiring it to the
main site" below).

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

## Local setup

```bash
npm install
cp .env.example .env       # fill in real values — see below
npm run prisma:migrate     # creates prisma/dev.db and applies migrations
npm run seed:demo          # optional: one sample product to look at
npm run dev                # http://localhost:4100
```

Run `npm test` any time — it's offline and takes well under a second (42
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
- **`SMTP_*` / `EMAIL_FROM`** — needed for the "email it to me" delivery
  method. Any standard SMTP provider works.
- **`ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_SESSION_SECRET`** — one
  operator account, no user table. Generate the session secret with
  `openssl rand -hex 32`.

`lib/env.ts` validates all of this at first use and throws a specific,
readable error naming exactly which variable is missing or malformed —
it will not let a route silently send a malformed request to Paystack.

## Adding a video to sell

Go to `/admin` (prompts for the `ADMIN_EMAIL`/`ADMIN_PASSWORD` from your
`.env`), create a product, then add one or more editions under it. For each
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

### Docker (recommended)

```bash
cp .env.example .env   # fill in real values on the server
docker compose up -d --build
```

`docker-compose.yml` mounts a named volume at `/app/data` and points
`DATABASE_URL` there, so the SQLite file survives a rebuild.
`docker-entrypoint.sh` runs `prisma migrate deploy` on every container start
before starting the server — safe to do on every restart for a
single-instance deploy like this one (it only applies migrations not
already recorded).

Put this behind a reverse proxy (Nginx, Caddy, Traefik) that terminates TLS
and forwards to `127.0.0.1:4100` — Paystack's webhook must reach an `https://`
URL. Then, in the Paystack dashboard, register
`https://<your-domain>/api/webhooks/paystack` under Settings → API Keys &
Webhooks.

### Cloudflare DNS proxy in front of a VPS

`docker-compose.prod.yml` + `Caddyfile` is exactly that reverse-proxy setup,
prebuilt: Caddy terminates TLS on 80/443 and is the only thing published to
the host; `video-store` itself isn't reachable from outside the container
network at all. This is a **separate compose file** from the plain
`docker-compose.yml` above (not an override), specifically so local/dev usage
keeps working over plain HTTP on `:4100` exactly as it does today — the two
are never meant to run against the same project/volumes at once.

```bash
cp .env.example .env
# edit .env: set APP_URL=https://<your domain>, plus PAYSTACK/CLOUDINARY/SMTP
# edit Caddyfile: replace the placeholder domain with your real one
docker compose -f docker-compose.prod.yml up -d --build
```

In Cloudflare's dashboard: DNS → A record for your domain pointing at the
VPS's IP, proxied (orange cloud) on. SSL/TLS → **Full**, not **Flexible** —
Flexible means the Cloudflare-to-VPS hop is plain HTTP, and this app carries
admin login and Paystack webhook traffic over that hop. Caddy's self-signed
cert (`tls internal` in the Caddyfile) is what Full mode talks to; see the
comment in that file for the "Full (strict)" alternative if you want the
origin cert chain validated too, which needs a Cloudflare Origin CA cert
instead.

On the VPS's own firewall (ufw/firewalld), only allow 80/443 in — Docker's
default bridge networking already keeps `video-store` unreachable from
outside the host in this compose file (`expose`, not `ports`), but a host
firewall is standard hardening on top of that regardless.

The admin login cookie's `Secure` flag is set from the request's actual
scheme (`x-forwarded-proto`, which Caddy sets automatically when it proxies
to `video-store`), not from `NODE_ENV` — so this correctly gets marked
`Secure` once traffic is really arriving over HTTPS through Caddy, and
correctly does *not* over the plain-HTTP `docker-compose.yml` setup above.
Getting this backwards is exactly what silently breaks login: a `Secure`
cookie set while testing directly over `http://` is dropped by the browser
with no visible error, and `/admin` just bounces back to the login page.

### Without Docker

Any Node 22+ host works:

```bash
npm ci
npm run prisma:deploy   # applies migrations, does not touch dev.db
npm run build
npm start                # next start -p 4100
```

Put a process manager in front of it (`pm2`, `systemd`) so it restarts on
crash and on boot.

### Why not the same cPanel hosting as okhubtech.com

That host serves static files only — no Node process can run there at all
(see `../../docs/deployment.md`). This service needs a live server for
checkout, the Paystack webhook, and gated downloads, so it needs an actual
Node host: a small VPS, Render, Railway, Fly.io, or cPanel's Node.js
Selector if the hosting plan has one. A VPS with the Docker setup above is
the option this README assumes.

## Wiring it to the main site

okhubtech.com's `components/ECommerceSection.tsx` links out to this
service rather than embedding a catalog of its own — the static export
has no way to show live prices or run a checkout. Point
`NEXT_PUBLIC_VIDEO_STORE_URL` (in the main repo's `.env`) at wherever this
service ends up deployed (e.g. `https://store.okhubtech.com`); until that's
set, the section links to `/contact` instead of a placeholder URL.

## Before this goes live with real money

- [ ] Swap `PAYSTACK_SECRET_KEY` from `sk_test_...` to the live key, and
      register the **live** webhook URL in the Paystack dashboard (test and
      live mode have separate webhook registrations).
- [ ] Run one real end-to-end purchase in Paystack **test mode** first —
      card checkout, webhook delivery, and the download link all actually
      landing — before flipping to live keys. `fulfillOrder`'s
      already-paid/amount-mismatch/not-successful branches are covered by
      unit tests on their component logic (signature verification, grant
      expiry, price computation), but the full webhook-to-Paystack round
      trip only exercises for real against Paystack's own sandbox.
  - Checked once, on this build, against local test data by hand — see
    the smoke-test notes in the PR/commit this shipped in for exactly what
    was exercised (checkout validation, webhook signature accept/reject,
    webhook idempotency including the retry-after-a-failed-attempt case,
    the download gate's expiry and use-count enforcement, and the
    already-paid success-page path). Not yet run against a live Paystack
    test-mode transaction.
- [ ] Confirm the Cloudinary assets you intend to sell are set to
      **Authenticated** delivery, not public — a public asset's "signed" URL
      still leaks the permanent public one alongside it.
- [ ] Set real values for every `.env.example` var in production, including
      a freshly generated `ADMIN_SESSION_SECRET` (don't reuse a dev one).
- [ ] Point a real domain at it over HTTPS — Paystack will not deliver
      webhooks to plain HTTP.

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
prisma/schema.prisma           SQLite schema (see the note there on why no enums)
tests/                         42 offline gate tests, node:test + node:assert, zero deps
```
