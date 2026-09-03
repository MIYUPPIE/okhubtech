import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <main className="shell">
      <h1>Orders</h1>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Customer</th>
            <th>Item</th>
            <th>Amount</th>
            <th>Delivery</th>
            <th>Status</th>
            <th>Reference</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id}>
              <td>{new Date(o.createdAt).toLocaleString()}</td>
              <td>{o.customerEmail}</td>
              <td>
                {o.productTitle} — {o.variantName}
              </td>
              <td>{formatMoney(o.amountKobo, o.currency)}</td>
              <td>{o.deliveryMethod}</td>
              <td>
                <span className={`tag ${o.status === "PAID" ? "active" : "inactive"}`}>{o.status}</span>
              </td>
              <td className="muted" style={{ fontFamily: "monospace", fontSize: "0.8rem" }}>
                {o.reference}
              </td>
            </tr>
          ))}
          {orders.length === 0 && (
            <tr>
              <td colSpan={7} className="muted">
                No orders yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </main>
  );
}
