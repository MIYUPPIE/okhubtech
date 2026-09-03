"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Product = {
  id: string;
  slug: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  active: boolean;
};

type Variant = {
  id: string;
  name: string;
  description: string | null;
  priceNaira: number;
  currency: string;
  cloudinaryPublicId: string | null;
  cloudinaryResourceType: string;
  externalAssetUrl: string | null;
  active: boolean;
};

export default function ProductManager({ product, variants }: { product: Product; variants: Variant[] }) {
  const router = useRouter();
  const [form, setForm] = useState(product);
  const [savingProduct, setSavingProduct] = useState(false);
  const [productError, setProductError] = useState<string | null>(null);

  async function saveProduct(e: React.FormEvent) {
    e.preventDefault();
    setSavingProduct(true);
    setProductError(null);
    const res = await fetch(`/api/admin/products/${product.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: form.title,
        description: form.description,
        thumbnailUrl: form.thumbnailUrl,
        active: form.active,
      }),
    });
    setSavingProduct(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setProductError(typeof body?.error === "string" ? body.error : "Could not save");
      return;
    }
    router.refresh();
  }

  return (
    <>
      <h1>{product.title}</h1>
      <p className="muted">/videos/{product.slug}</p>

      <form className="inline" onSubmit={saveProduct}>
        <h2 style={{ marginTop: 0 }}>Product details</h2>
        <div className="field">
          <label>Title</label>
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>
        <div className="field">
          <label>Description</label>
          <textarea
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
        <div className="field">
          <label>Thumbnail URL</label>
          <input value={form.thumbnailUrl} onChange={(e) => setForm({ ...form, thumbnailUrl: e.target.value })} />
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => setForm({ ...form, active: e.target.checked })}
            style={{ width: "auto" }}
          />
          Active (visible on the storefront)
        </label>
        {productError && <div className="notice error">{productError}</div>}
        <button type="submit" className="btn" disabled={savingProduct}>
          {savingProduct ? "Saving..." : "Save product"}
        </button>
      </form>

      <h2>Editions</h2>
      <div className="grid" style={{ gridTemplateColumns: "1fr" }}>
        {variants.map((v) => (
          <VariantEditor key={v.id} variant={v} onChanged={() => router.refresh()} />
        ))}
        {variants.length === 0 && <p className="muted">No editions yet — add one below.</p>}
      </div>

      <NewVariantForm productId={product.id} onCreated={() => router.refresh()} />
    </>
  );
}

function VariantEditor({ variant, onChanged }: { variant: Variant; onChanged: () => void }) {
  const [assetKind, setAssetKind] = useState<"cloudinary" | "external">(
    variant.cloudinaryPublicId ? "cloudinary" : "external",
  );
  const [form, setForm] = useState(variant);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/admin/variants/${variant.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        description: form.description || undefined,
        priceNaira: form.priceNaira,
        currency: form.currency,
        active: form.active,
        cloudinaryPublicId: assetKind === "cloudinary" ? form.cloudinaryPublicId || null : null,
        cloudinaryResourceType: form.cloudinaryResourceType,
        externalAssetUrl: assetKind === "external" ? form.externalAssetUrl || null : null,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(typeof body?.error === "string" ? body.error : "Could not save edition");
      return;
    }
    onChanged();
  }

  async function remove() {
    if (!confirm(`Delete "${variant.name}"? This can't be undone.`)) return;
    setDeleting(true);
    const res = await fetch(`/api/admin/variants/${variant.id}`, { method: "DELETE" });
    setDeleting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(
        typeof body?.error === "string" ? body.error : "Could not delete — deactivate it instead if it has orders.",
      );
      return;
    }
    onChanged();
  }

  return (
    <div className="card" style={{ padding: "1rem 1.1rem" }}>
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
        <div className="field" style={{ flex: 1, minWidth: 160 }}>
          <label>Name</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="field" style={{ width: 140 }}>
          <label>Price (NGN)</label>
          <input
            type="number"
            min={1}
            step="1"
            value={form.priceNaira}
            onChange={(e) => setForm({ ...form, priceNaira: Number(e.target.value) })}
          />
        </div>
        <div className="field" style={{ width: 100 }}>
          <label>Currency</label>
          <input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} />
        </div>
      </div>
      <div className="field">
        <label>Description (optional)</label>
        <input value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </div>

      <div className="field">
        <label>Deliverable</label>
        <select value={assetKind} onChange={(e) => setAssetKind(e.target.value as "cloudinary" | "external")}>
          <option value="cloudinary">Cloudinary asset (signed, expiring download)</option>
          <option value="external">External link (Google Drive / Dropbox share)</option>
        </select>
      </div>
      {assetKind === "cloudinary" ? (
        <div style={{ display: "flex", gap: "1rem" }}>
          <div className="field" style={{ flex: 1 }}>
            <label>Cloudinary public ID</label>
            <input
              value={form.cloudinaryPublicId ?? ""}
              onChange={(e) => setForm({ ...form, cloudinaryPublicId: e.target.value })}
              placeholder="folder/my-video-1080p"
            />
          </div>
          <div className="field" style={{ width: 140 }}>
            <label>Resource type</label>
            <input
              value={form.cloudinaryResourceType}
              onChange={(e) => setForm({ ...form, cloudinaryResourceType: e.target.value })}
            />
          </div>
        </div>
      ) : (
        <div className="field">
          <label>External URL</label>
          <input
            value={form.externalAssetUrl ?? ""}
            onChange={(e) => setForm({ ...form, externalAssetUrl: e.target.value })}
            placeholder="https://drive.google.com/..."
          />
        </div>
      )}
      <p className="muted" style={{ fontSize: "0.8rem" }}>
        Upload the video to Cloudinary first and set its delivery type to &ldquo;Authenticated&rdquo; (Media Library →
        asset → Access control), then paste its public ID above — that&apos;s what makes the download link expire.
        Or paste an existing Drive/Dropbox share link instead.
      </p>

      <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", margin: "0.5rem 0 1rem" }}>
        <input
          type="checkbox"
          checked={form.active}
          onChange={(e) => setForm({ ...form, active: e.target.checked })}
          style={{ width: "auto" }}
        />
        Active (purchasable)
      </label>

      {error && <div className="notice error">{error}</div>}

      <div style={{ display: "flex", gap: "0.75rem" }}>
        <button type="button" className="btn" onClick={save} disabled={saving}>
          {saving ? "Saving..." : "Save edition"}
        </button>
        <button type="button" className="btn btn-outline" onClick={remove} disabled={deleting}>
          {deleting ? "Deleting..." : "Delete"}
        </button>
      </div>
    </div>
  );
}

function NewVariantForm({ productId, onCreated }: { productId: string; onCreated: () => void }) {
  const [assetKind, setAssetKind] = useState<"cloudinary" | "external">("cloudinary");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priceNaira, setPriceNaira] = useState(0);
  const [currency, setCurrency] = useState("NGN");
  const [cloudinaryPublicId, setCloudinaryPublicId] = useState("");
  const [cloudinaryResourceType, setCloudinaryResourceType] = useState("video");
  const [externalAssetUrl, setExternalAssetUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await fetch(`/api/admin/products/${productId}/variants`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name,
        description: description || undefined,
        priceNaira,
        currency,
        cloudinaryPublicId: assetKind === "cloudinary" ? cloudinaryPublicId : undefined,
        cloudinaryResourceType,
        externalAssetUrl: assetKind === "external" ? externalAssetUrl : undefined,
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(typeof body?.error === "string" ? body.error : "Could not create edition");
      return;
    }
    setName("");
    setDescription("");
    setPriceNaira(0);
    setCloudinaryPublicId("");
    setExternalAssetUrl("");
    onCreated();
  }

  return (
    <form className="inline" onSubmit={submit}>
      <h2 style={{ marginTop: 0 }}>Add an edition</h2>
      <div className="field">
        <label>Name</label>
        <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="1080p — Edited" />
      </div>
      <div className="field">
        <label>Description (optional)</label>
        <input value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div style={{ display: "flex", gap: "1rem" }}>
        <div className="field" style={{ width: 140 }}>
          <label>Price (NGN)</label>
          <input
            type="number"
            min={1}
            step="1"
            required
            value={priceNaira}
            onChange={(e) => setPriceNaira(Number(e.target.value))}
          />
        </div>
        <div className="field" style={{ width: 100 }}>
          <label>Currency</label>
          <input value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} />
        </div>
      </div>
      <div className="field">
        <label>Deliverable</label>
        <select value={assetKind} onChange={(e) => setAssetKind(e.target.value as "cloudinary" | "external")}>
          <option value="cloudinary">Cloudinary asset</option>
          <option value="external">External link</option>
        </select>
      </div>
      {assetKind === "cloudinary" ? (
        <div style={{ display: "flex", gap: "1rem" }}>
          <div className="field" style={{ flex: 1 }}>
            <label>Cloudinary public ID</label>
            <input required value={cloudinaryPublicId} onChange={(e) => setCloudinaryPublicId(e.target.value)} />
          </div>
          <div className="field" style={{ width: 140 }}>
            <label>Resource type</label>
            <input value={cloudinaryResourceType} onChange={(e) => setCloudinaryResourceType(e.target.value)} />
          </div>
        </div>
      ) : (
        <div className="field">
          <label>External URL</label>
          <input required type="url" value={externalAssetUrl} onChange={(e) => setExternalAssetUrl(e.target.value)} />
        </div>
      )}
      {error && <div className="notice error">{error}</div>}
      <button type="submit" className="btn" disabled={submitting}>
        {submitting ? "Adding..." : "Add edition"}
      </button>
    </form>
  );
}
