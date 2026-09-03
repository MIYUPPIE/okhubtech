import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveAssetSource } from "../lib/variant.ts";

test("resolves a cloudinary asset when only cloudinaryPublicId is set", () => {
  const source = resolveAssetSource({
    cloudinaryPublicId: "videos/demo-1080p",
    cloudinaryResourceType: "video",
    externalAssetUrl: null,
  });
  assert.deepEqual(source, { kind: "cloudinary", publicId: "videos/demo-1080p", resourceType: "video" });
});

test("resolves an external asset when only externalAssetUrl is set", () => {
  const source = resolveAssetSource({
    cloudinaryPublicId: null,
    cloudinaryResourceType: "video",
    externalAssetUrl: "https://drive.google.com/uc?id=abc",
  });
  assert.deepEqual(source, { kind: "external", url: "https://drive.google.com/uc?id=abc" });
});

test("throws when neither asset field is set", () => {
  assert.throws(() =>
    resolveAssetSource({ cloudinaryPublicId: null, cloudinaryResourceType: "video", externalAssetUrl: null }),
  );
});

test("throws when both asset fields are set — ambiguous deliverable", () => {
  assert.throws(() =>
    resolveAssetSource({
      cloudinaryPublicId: "videos/demo",
      cloudinaryResourceType: "video",
      externalAssetUrl: "https://drive.google.com/uc?id=abc",
    }),
  );
});

test("defaults resourceType to video if it's somehow empty", () => {
  const source = resolveAssetSource({
    cloudinaryPublicId: "videos/demo",
    cloudinaryResourceType: "",
    externalAssetUrl: null,
  });
  assert.equal(source.kind, "cloudinary");
  assert.equal(source.kind === "cloudinary" && source.resourceType, "video");
});
