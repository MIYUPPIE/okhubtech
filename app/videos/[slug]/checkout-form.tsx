"use client";

import { useState } from "react";
import { formatMoney } from "@/lib/money";

type VariantOption = {
  id: string;
  name: string;
  description: string | null;
  priceKobo: number;
  currency: string;
};

export default function CheckoutForm({ variants }: { variants: VariantOption[] }) {
  const [variantId, setVariantId] = useState(variants[0]?.id ?? "");
  const [deliveryMethod, setDeliveryMethod] = useState<"DOWNLOAD" | "EMAIL">("DOWNLOAD");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ variantId, deliveryMethod, email, name: name || undefined }),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body?.error ?? "Could not start checkout.");
      }
      window.location.href = body.authorizationUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSubmitting(false);
    }
  }

  return (
    <form className="inline" onSubmit={handleSubmit}>
      <h2 style={{ marginTop: 0 }}>Choose an edition</h2>
      <div className="option-row">
        {variants.map((v) => (
          <label key={v.id} className={`radio-card ${variantId === v.id ? "selected" : ""}`}>
            <span>
              <strong>{v.name}</strong>
              {v.description && (
                <>
                  <br />
                  <span className="muted" style={{ fontSize: "0.85rem" }}>
                    {v.description}
                  </span>
                </>
              )}
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <span className="price">{formatMoney(v.priceKobo, v.currency)}</span>
              <input
                type="radio"
                name="variant"
                value={v.id}
                checked={variantId === v.id}
                onChange={() => setVariantId(v.id)}
              />
            </span>
          </label>
        ))}
      </div>

      <h2>How should we deliver it?</h2>
      <div className="option-row">
        <label className={`radio-card ${deliveryMethod === "DOWNLOAD" ? "selected" : ""}`}>
          <span>
            <strong>Instant download</strong>
            <br />
            <span className="muted" style={{ fontSize: "0.85rem" }}>
              Get a secure download link right after payment.
            </span>
          </span>
          <input
            type="radio"
            name="delivery"
            value="DOWNLOAD"
            checked={deliveryMethod === "DOWNLOAD"}
            onChange={() => setDeliveryMethod("DOWNLOAD")}
          />
        </label>
        <label className={`radio-card ${deliveryMethod === "EMAIL" ? "selected" : ""}`}>
          <span>
            <strong>Email it to me</strong>
            <br />
            <span className="muted" style={{ fontSize: "0.85rem" }}>
              We&apos;ll send the secure download link to your inbox.
            </span>
          </span>
          <input
            type="radio"
            name="delivery"
            value="EMAIL"
            checked={deliveryMethod === "EMAIL"}
            onChange={() => setDeliveryMethod("EMAIL")}
          />
        </label>
      </div>

      <div className="field">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
      </div>
      <div className="field">
        <label htmlFor="name">Name (optional)</label>
        <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      {error && <div className="notice error">{error}</div>}

      <button type="submit" className="btn" disabled={submitting || !variantId}>
        {submitting ? "Starting checkout..." : "Pay with Paystack"}
      </button>
    </form>
  );
}
