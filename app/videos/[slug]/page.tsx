import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import CheckoutForm from "./checkout-form";

export const dynamic = "force-dynamic";

export default async function VideoDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await prisma.product.findUnique({
    where: { slug },
    include: { variants: { where: { active: true }, orderBy: { priceKobo: "asc" } } },
  });

  if (!product || !product.active || product.variants.length === 0) notFound();

  return (
    <main className="shell">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={product.thumbnailUrl}
        alt={product.title}
        style={{ width: "100%", maxHeight: 420, objectFit: "cover", borderRadius: 12, marginBottom: "1.5rem" }}
      />
      <h1>{product.title}</h1>
      <p className="muted">{product.description}</p>

      <CheckoutForm
        variants={product.variants.map((v) => ({
          id: v.id,
          name: v.name,
          description: v.description,
          priceKobo: v.priceKobo,
          currency: v.currency,
        }))}
      />
    </main>
  );
}
