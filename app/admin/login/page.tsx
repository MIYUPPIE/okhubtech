"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { extractErrorMessage } from "@/lib/api-error";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(extractErrorMessage(body, "Login failed"));
      setSubmitting(false);
      return;
    }
    router.push("/admin");
    router.refresh();
  }

  return (
    <main className="shell" style={{ maxWidth: 420 }}>
      <h1>Admin login</h1>
      <form className="inline" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && <div className="notice error">{error}</div>}
        <button type="submit" className="btn" disabled={submitting}>
          {submitting ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </main>
  );
}
