import { Resend } from "resend";
import { resendEnv } from "./env.ts";

// Resend's HTTP API, not SMTP: Workers has no raw TCP socket support the way
// nodemailer's SMTP transport needs it (this replaced an SMTP-based mailer
// when this service moved from a Docker/VPS deploy to Cloudflare Workers —
// see the git history for that transporter if a future non-Workers deploy
// wants it back). A plain fetch call under the hood, so no runtime concerns
// here beyond having a real RESEND_API_KEY.

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
  const e = resendEnv();
  const resend = new Resend(e.RESEND_API_KEY);
  const { error } = await resend.emails.send({
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
  if (error) throw new Error(`Resend send failed: ${error.message}`);
}
