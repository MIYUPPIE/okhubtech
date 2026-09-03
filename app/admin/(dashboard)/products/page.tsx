import Link from "next/link";
import { prisma } from "@/lib/prisma";
import NewProductForm from "./new-product-form";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const products = await prisma.product.findMany({
    include: { variants: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="shell">
      <h1>Products</h1>
      <table>
        <thead>
          <tr>
            <th>Title</th>
            <th>Slug</th>
            <th>Editions</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id}>
              <td>{p.title}</td>
              <td className="muted">{p.slug}</td>
              <td>{p.variants.length}</td>
              <td>
                <span className={`tag ${p.active ? "active" : "inactive"}`}>{p.active ? "Active" : "Inactive"}</span>
              </td>
              <td>
                <Link href={`/admin/products/${p.id}`}>Manage</Link>
              </td>
            </tr>
          ))}
          {products.length === 0 && (
            <tr>
              <td colSpan={5} className="muted">
                No products yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <NewProductForm />
    </main>
  );
}
