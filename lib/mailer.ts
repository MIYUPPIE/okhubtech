import nodemailer from "nodemailer";
import { smtpEnv } from "./env.ts";

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter() {
  if (transporter) return transporter;
  const e = smtpEnv();
  transporter = nodemailer.createTransport({
    host: e.SMTP_HOST,
    port: e.SMTP_PORT,
    secure: e.SMTP_PORT === 465,
    auth: { user: e.SMTP_USER, pass: e.SMTP_PASSWORD },
  });
  return transporter;
}

function escapeHtml(s: string): string {
  const map: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return s.replace(/[&<>"']/g, (c) => map[c] as string);
}

export async function sendDeliveryEmail(params: {
  to: string;
  productTitle: string;
  variantName: string;
  downloadUrl: string;
  expiresAt: Date;
}) {
  const e = smtpEnv();
  await getTransporter().sendMail({
    from: e.EMAIL_FROM,
    to: params.to,
    subject: `Your download: ${params.productTitle} — ${params.variantName}`,
    text: [
      "Thanks for your purchase.",
      "",
      `${params.productTitle} — ${params.variantName}`,
      "",
      `Download: ${params.downloadUrl}`,
      "",
      `This link works a limited number of times and expires ${params.expiresAt.toUTCString()}.`,
    ].join("\n"),
    html: [
      "<p>Thanks for your purchase.</p>",
      `<p><strong>${escapeHtml(params.productTitle)} — ${escapeHtml(params.variantName)}</strong></p>`,
      `<p><a href="${params.downloadUrl}">Download your video</a></p>`,
      `<p style="color:#666;font-size:13px">This link works a limited number of times and expires ${params.expiresAt.toUTCString()}.</p>`,
    ].join(""),
  });
}
