import { test } from "node:test";
import assert from "node:assert/strict";

const ALL_VALID_ENV: Record<string, string> = {
  APP_URL: "http://localhost:4100",
  PAYSTACK_SECRET_KEY: "sk_test_xxx",
  CLOUDINARY_CLOUD_NAME: "demo",
  CLOUDINARY_API_KEY: "123",
  CLOUDINARY_API_SECRET: "secret",
  RESEND_API_KEY: "re_test_xxx",
  EMAIL_FROM: "store@okhub.tech",
  ADMIN_EMAIL: "admin@okhub.tech",
  ADMIN_PASSWORD: "a-long-enough-password",
  ADMIN_SESSION_SECRET: "0123456789abcdef0123456789abcdef",
};

// Each scenario imports lib/env.ts fresh (cache-busted via a unique query
// string) because every group memoises its result at module scope on first
// read — without this, whichever scenario ran first would poison the others.
async function freshEnvModule() {
  return import(`../lib/env.ts?t=${Date.now()}-${Math.random()}`);
}

// Must be async and must `await fn()` before restoring — every caller here
// passes an async callback, and a synchronous `return fn()` inside a
// try/finally restores process.env as soon as that callback's *first*
// `await` suspends it, not once it actually finishes. The env this test is
// asserting against gets reverted out from under it mid-run.
async function withEnv<T>(vars: Record<string, string | undefined>, fn: () => Promise<T>): Promise<T> {
  const saved = { ...process.env };
  for (const [key, value] of Object.entries(vars)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    return await fn();
  } finally {
    process.env = saved;
  }
}

test("adminEnv() succeeds on ADMIN_* alone — Cloudinary/Resend/Paystack being unset must not block admin login", async () => {
  const adminOnly = {
    ADMIN_EMAIL: ALL_VALID_ENV.ADMIN_EMAIL,
    ADMIN_PASSWORD: ALL_VALID_ENV.ADMIN_PASSWORD,
    ADMIN_SESSION_SECRET: ALL_VALID_ENV.ADMIN_SESSION_SECRET,
  };
  await withEnv(
    {
      ...adminOnly,
      CLOUDINARY_CLOUD_NAME: undefined,
      CLOUDINARY_API_KEY: undefined,
      CLOUDINARY_API_SECRET: undefined,
      RESEND_API_KEY: undefined,
      PAYSTACK_SECRET_KEY: undefined,
    },
    async () => {
      const { adminEnv } = await freshEnvModule();
      const result = adminEnv();
      assert.equal(result.ADMIN_EMAIL, adminOnly.ADMIN_EMAIL);
    },
  );
});

test("cloudinaryEnv() throws a descriptive error when its own vars are missing, independent of everything else being valid", async () => {
  await withEnv({ ...ALL_VALID_ENV, CLOUDINARY_API_KEY: undefined }, async () => {
    const { cloudinaryEnv, adminEnv } = await freshEnvModule();
    assert.throws(() => cloudinaryEnv(), /Cloudinary environment configuration.*CLOUDINARY_API_KEY/);
    // A sibling group with everything it needs must still work.
    assert.doesNotThrow(() => adminEnv());
  });
});

test("resendEnv() rejects a missing RESEND_API_KEY independent of ADMIN_EMAIL being malformed", async () => {
  await withEnv({ ...ALL_VALID_ENV, RESEND_API_KEY: undefined, ADMIN_EMAIL: "not-an-email" }, async () => {
    const { resendEnv } = await freshEnvModule();
    assert.throws(() => resendEnv(), /RESEND_API_KEY/);
  });
});

test("adminEnv() rejects a malformed ADMIN_EMAIL even when every other group is fully valid", async () => {
  await withEnv({ ...ALL_VALID_ENV, ADMIN_EMAIL: "not-an-email" }, async () => {
    const { adminEnv } = await freshEnvModule();
    assert.throws(() => adminEnv(), /ADMIN_EMAIL/);
  });
});

test("deliveryEnv() applies both defaults when unset", async () => {
  await withEnv(
    { ...ALL_VALID_ENV, DOWNLOAD_TOKEN_TTL_HOURS: undefined, DOWNLOAD_MAX_USES: undefined },
    async () => {
      const { deliveryEnv } = await freshEnvModule();
      const result = deliveryEnv();
      assert.equal(result.DOWNLOAD_TOKEN_TTL_HOURS, 72);
      assert.equal(result.DOWNLOAD_MAX_USES, 5);
    },
  );
});

test("coreEnv() and paystackEnv() each validate independently", async () => {
  await withEnv({ ...ALL_VALID_ENV, PAYSTACK_SECRET_KEY: undefined }, async () => {
    const { coreEnv, paystackEnv } = await freshEnvModule();
    assert.doesNotThrow(() => coreEnv());
    assert.throws(() => paystackEnv(), /Paystack/);
  });
});

test("coreEnv() does not require DATABASE_URL — the running app reaches D1 via a binding, not a connection string", async () => {
  await withEnv({ APP_URL: ALL_VALID_ENV.APP_URL, DATABASE_URL: undefined }, async () => {
    const { coreEnv } = await freshEnvModule();
    assert.doesNotThrow(() => coreEnv());
  });
});
