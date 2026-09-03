/**
 * Local/dev demo data only — one sample product with two editions, so the
 * storefront and admin have something to look at on a fresh database. Never
 * run this against a production database: it is not meant to represent a
 * real catalog entry, only to exercise the checkout and admin UI end to end.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const product = await prisma.product.upsert({
    where: { slug: "demo-ecommerce-launch-video" },
    update: {},
    create: {
      slug: "demo-ecommerce-launch-video",
      title: "Demo: Ecommerce Launch Explainer",
      description:
        "Sample catalog entry for local testing — replace or delete this from /admin/products once real videos are ready to sell.",
      thumbnailUrl: "https://res.cloudinary.com/demo/image/upload/w_800,h_450,c_fill/sample.jpg",
      active: true,
      variants: {
        create: [
          {
            name: "1080p — Edited",
            description: "Final edited cut, 1080p, with music and captions.",
            priceKobo: 1_500_000, // NGN 15,000
            currency: "NGN",
            externalAssetUrl: "https://drive.google.com/uc?id=REPLACE_ME",
            active: true,
          },
          {
            name: "4K — Raw + source files",
            description: "Raw 4K footage plus the editable project file.",
            priceKobo: 3_500_000, // NGN 35,000
            currency: "NGN",
            externalAssetUrl: "https://drive.google.com/uc?id=REPLACE_ME_TOO",
            active: true,
          },
        ],
      },
    },
  });

  console.log(`Seeded demo product: ${product.slug}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
