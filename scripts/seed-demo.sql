-- Local/dev demo data only — one sample product with two editions, so the
-- storefront and admin have something to look at on a fresh database. Never
-- run this against a production database: it is not meant to represent a
-- real catalog entry, only to exercise the checkout and admin UI end to end.
--
-- Raw SQL rather than a Prisma seed script: the `runtime = "cloudflare"`
-- client generator (prisma/schema.prisma) requires a driver adapter to
-- construct at all, and adding one just for a local convenience script
-- wasn't worth it — this applies the same way migrations do:
--   npx wrangler d1 execute video-store --local --file=scripts/seed-demo.sql
--
-- INSERT OR IGNORE keyed on Product.slug's unique index makes this safe to
-- run more than once — a second run is a no-op, not a duplicate or an error.

INSERT OR IGNORE INTO "Product" (id, slug, title, description, thumbnailUrl, active, createdAt, updatedAt)
VALUES (
  'demo-product-1',
  'demo-ecommerce-launch-video',
  'Demo: Ecommerce Launch Explainer',
  'Sample catalog entry for local testing — replace or delete this from /admin/products once real videos are ready to sell.',
  'https://res.cloudinary.com/demo/image/upload/w_800,h_450,c_fill/sample.jpg',
  1,
  datetime('now'),
  datetime('now')
);

INSERT OR IGNORE INTO "Variant" (id, productId, name, description, priceKobo, currency, externalAssetUrl, active, createdAt, updatedAt)
VALUES (
  'demo-variant-1080p',
  'demo-product-1',
  '1080p — Edited',
  'Final edited cut, 1080p, with music and captions.',
  1500000, -- NGN 15,000
  'NGN',
  'https://drive.google.com/uc?id=REPLACE_ME',
  1,
  datetime('now'),
  datetime('now')
);

INSERT OR IGNORE INTO "Variant" (id, productId, name, description, priceKobo, currency, externalAssetUrl, active, createdAt, updatedAt)
VALUES (
  'demo-variant-4k',
  'demo-product-1',
  '4K — Raw + source files',
  'Raw 4K footage plus the editable project file.',
  3500000, -- NGN 35,000
  'NGN',
  'https://drive.google.com/uc?id=REPLACE_ME_TOO',
  1,
  datetime('now'),
  datetime('now')
);
