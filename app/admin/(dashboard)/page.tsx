import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const [productCount, activeProductCount, orderCount, paidAgg] = await Promise.all([
    prisma.product.count(),
    prisma.product.count({ where: { active: true } }),
    prisma.order.count(),
    prisma.order.aggregate({ where: { status: "PAID" }, _sum: { amountKobo: true }, _count: true }),
  ]);

  return (
    <main className="shell">
      <h1>Dashboard</h1>
      <div className="stat-row">
        <div className="stat">
          <div className="value">
            {activeProductCount}/{productCount}
          </div>
          <div className="muted">Active products</div>
        </div>
        <div className="stat">
          <div className="value">{paidAgg._count}</div>
          <div className="muted">Paid orders</div>
        </div>
        <div className="stat">
          <div className="value">{formatMoney(paidAgg._sum.amountKobo ?? 0)}</div>
          <div className="muted">Revenue</div>
        </div>
        <div className="stat">
          <div className="value">{orderCount}</div>
          <div className="muted">All orders (incl. pending/failed)</div>
        </div>
      </div>
      <p style={{ display: "flex", gap: "0.75rem" }}>
        <Link href="/admin/products" className="btn">
          Manage products
        </Link>
        <Link href="/admin/orders" className="btn btn-outline">
          View orders
        </Link>
      </p>
    </main>
  );
}
