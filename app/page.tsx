import Link from "next/link";
import { getPrisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function StorefrontPage() {
  const prisma = getPrisma();
  const products = await prisma.product.findMany({
    where: { active: true, variants: { some: { active: true } } },
    include: { variants: { where: { active: true }, orderBy: { priceKobo: "asc" } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="shell">
      <h1>Videos</h1>
      <p className="muted">Technology and ecommerce videos. Pick an edition, pay with Paystack, get it instantly.</p>

      {products.length === 0 ? (
        <p className="muted" style={{ marginTop: "2rem" }}>
          Nothing is on sale right now — check back soon.
        </p>
      ) : (
        <div className="grid">
          {products.map((p) => {
            const cheapest = p.variants[0];
            return (
              <Link key={p.id} href={`/videos/${p.slug}`} className="card" style={{ textDecoration: "none", color: "inherit" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.thumbnailUrl} alt={p.title} />
                <div className="card-body">
                  <h3>{p.title}</h3>
                  <p className="muted" style={{ fontSize: "0.9rem" }}>
                    {p.description.length > 120 ? `${p.description.slice(0, 117)}...` : p.description}
                  </p>
                  {cheapest && (
                    <p className="price">
                      From {formatMoney(cheapest.priceKobo, cheapest.currency)}
                      {p.variants.length > 1 ? ` · ${p.variants.length} editions` : ""}
                    </p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
