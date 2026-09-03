import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "OKHub Video Store",
  description: "Technology and ecommerce videos from OKHub, delivered digitally after Paystack checkout.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <nav>
            <Link href="/" className="brand">
              OKHub <span>Video Store</span>
            </Link>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
