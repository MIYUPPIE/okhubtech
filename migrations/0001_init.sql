-- Wrangler's own D1 migration file — applied with
-- `npm run d1:migrations:apply:local` / `:remote`, NOT `prisma migrate`.
-- D1 doesn't support Prisma's migrate engine directly (no shadow-database
-- support over a binding), so this is a hand-copied twin of
-- prisma/migrations/20260902165102_init/migration.sql, the actual source of
-- truth for the schema. When the schema changes: edit prisma/schema.prisma,
-- run `prisma migrate dev` against a local throwaway SQLite file to generate
-- the next prisma/migrations/<ts>_<name>/migration.sql, then copy *that* SQL
-- into a new 000N_<name>.sql here (`npm run d1:migrations:create -- <name>`
-- scaffolds the numbered filename). See this service's README, "Database
-- (Cloudflare D1)".
-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "thumbnailUrl" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Variant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priceKobo" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "cloudinaryPublicId" TEXT,
    "cloudinaryResourceType" TEXT NOT NULL DEFAULT 'video',
    "externalAssetUrl" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Variant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reference" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "variantId" TEXT NOT NULL,
    "productTitle" TEXT NOT NULL,
    "variantName" TEXT NOT NULL,
    "amountKobo" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "customerEmail" TEXT NOT NULL,
    "customerName" TEXT,
    "deliveryMethod" TEXT NOT NULL,
    "paystackAuthorizationUrl" TEXT,
    "paystackAccessCode" TEXT,
    "paidAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Order_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "Variant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DeliveryGrant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "maxUses" INTEGER NOT NULL DEFAULT 5,
    "useCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DeliveryGrant_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AccessLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "grantId" TEXT NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AccessLog_grantId_fkey" FOREIGN KEY ("grantId") REFERENCES "DeliveryGrant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventType" TEXT NOT NULL,
    "transactionId" INTEGER NOT NULL,
    "reference" TEXT NOT NULL,
    "rawPayload" TEXT NOT NULL,
    "orderId" TEXT,
    "processedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WebhookEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- CreateIndex
CREATE INDEX "Product_active_idx" ON "Product"("active");

-- CreateIndex
CREATE INDEX "Variant_productId_idx" ON "Variant"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_reference_key" ON "Order"("reference");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE INDEX "Order_customerEmail_idx" ON "Order"("customerEmail");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryGrant_token_key" ON "DeliveryGrant"("token");

-- CreateIndex
CREATE INDEX "DeliveryGrant_orderId_idx" ON "DeliveryGrant"("orderId");

-- CreateIndex
CREATE INDEX "AccessLog_grantId_idx" ON "AccessLog"("grantId");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookEvent_eventType_transactionId_key" ON "WebhookEvent"("eventType", "transactionId");
