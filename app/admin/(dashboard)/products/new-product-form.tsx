"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewProductForm() {
  const router = useRouter();
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/admin/products", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slug, title, description, thumbnailUrl }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(typeof body?.error === "string" ? body.error : "Could not create product");
      return;
    }
    setSlug("");
    setTitle("");
    setDescription("");
    setThumbnailUrl("");
    router.refresh();
  }

  return (
    <form className="inline" onSubmit={handleSubmit}>
      <h2 style={{ marginTop: 0 }}>New product</h2>
      <div className="field">
        <label htmlFor="slug">Slug (url-safe, e.g. ecommerce-launch-explainer)</label>
        <input
          id="slug"
          required
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="title">Title</label>
        <input id="title" required value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="description">Description</label>
        <textarea
          id="description"
          required
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="thumbnailUrl">Thumbnail URL</label>
        <input
          id="thumbnailUrl"
          required
          type="url"
          value={thumbnailUrl}
          onChange={(e) => setThumbnailUrl(e.target.value)}
          placeholder="https://res.cloudinary.com/..."
        />
      </div>
      {error && <div className="notice error">{error}</div>}
      <button type="submit" className="btn" disabled={submitting}>
        {submitting ? "Creating..." : "Create product"}
      </button>
    </form>
  );
}
