import { redirect } from "next/navigation";
import Link from "next/link";
import { isAdminRequest } from "@/lib/require-admin";

export const metadata = { robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const ok = await isAdminRequest();
  if (!ok) redirect("/admin/login");

  return (
    <>
      <div className="shell" style={{ paddingBottom: 0 }}>
        <nav
          style={{
            display: "flex",
            gap: "1.25rem",
            alignItems: "center",
            borderBottom: "1px solid var(--border)",
            paddingBottom: "1rem",
          }}
        >
          <Link href="/admin">Dashboard</Link>
          <Link href="/admin/products">Products</Link>
          <Link href="/admin/orders">Orders</Link>
          <form action="/api/admin/logout" method="post" style={{ marginLeft: "auto" }}>
            <button type="submit" className="btn btn-outline">
              Log out
            </button>
          </form>
        </nav>
      </div>
      {children}
    </>
  );
}
