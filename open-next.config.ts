import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// No incrementalCache override (the default template wires one up against
// an R2 bucket): every route in this app is `dynamic = "force-dynamic"` —
// storefront listings, checkout, admin, all read live from D1 on every
// request — so there's no static/ISR output for R2 to cache in the first
// place. Add one back (see https://opennext.js.org/cloudflare/caching) only
// if that changes.
export default defineCloudflareConfig({});
