import { z } from "zod";

/**
 * Env validation is split by feature area rather than one monolithic
 * schema, and each group is validated independently. The alternative (one
 * schema, one env() covering everything) meant logging into /admin — which
 * only ever touches ADMIN_* — failed with a Cloudinary/SMTP error before a
 * single product had been added, because nothing else in the .env was
 * filled in yet. A route should only be blocked by the config it actually
 * uses.
 */

const coreSchema = z.object({
  DATABASE_URL: z.string().min(1),
  APP_URL: z.string().url(),
});

const paystackSchema = z.object({
  PAYSTACK_SECRET_KEY: z.string().min(1),
});

const cloudinarySchema = z.object({
  CLOUDINARY_CLOUD_NAME: z.string().min(1),
  CLOUDINARY_API_KEY: z.string().min(1),
  CLOUDINARY_API_SECRET: z.string().min(1),
});

const smtpSchema = z.object({
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().min(1),
  SMTP_PASSWORD: z.string().min(1),
  EMAIL_FROM: z.string().min(1),
});

const adminSchema = z.object({
  ADMIN_EMAIL: z.string().email(),
  ADMIN_PASSWORD: z.string().min(8),
  ADMIN_SESSION_SECRET: z.string().min(16),
});

const deliverySchema = z.object({
  DOWNLOAD_TOKEN_TTL_HOURS: z.coerce.number().int().positive().default(72),
  DOWNLOAD_MAX_USES: z.coerce.number().int().positive().default(5),
});

const groups = {
  core: coreSchema,
  Paystack: paystackSchema,
  Cloudinary: cloudinarySchema,
  SMTP: smtpSchema,
  admin: adminSchema,
  delivery: deliverySchema,
};

type Groups = typeof groups;
const cache = new Map<keyof Groups, unknown>();

function readGroup<K extends keyof Groups>(key: K): z.infer<Groups[K]> {
  const cached = cache.get(key);
  if (cached) return cached as z.infer<Groups[K]>;
  const parsed = groups[key].safeParse(process.env);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`video-store: invalid or missing ${key} environment configuration — ${problems}`);
  }
  cache.set(key, parsed.data);
  return parsed.data;
}

export const coreEnv = () => readGroup("core");
export const paystackEnv = () => readGroup("Paystack");
export const cloudinaryEnv = () => readGroup("Cloudinary");
export const smtpEnv = () => readGroup("SMTP");
export const adminEnv = () => readGroup("admin");
export const deliveryEnv = () => readGroup("delivery");
