import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { checkGrant } from "@/lib/delivery";
import { resolveAssetSource } from "@/lib/variant";
import { signedAssetUrl } from "@/lib/cloudinary";

/**
 * The only door to an actual video file. A buyer never sees a Cloudinary
 * public id or a Drive link directly — they get this token, and this route
 * decides, on every hit, whether that token still earns them the asset.
 */
export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const prisma = getPrisma();
  const grant = await prisma.deliveryGrant.findUnique({
    where: { token },
    include: { order: { include: { variant: true } } },
  });

  if (!grant) return errorPage("This download link is not valid.", 404);
  if (grant.order.status !== "PAID") return errorPage("This order has not been paid for.", 402);

  const check = checkGrant(grant);
  if (!check.ok) {
    return errorPage(
      check.reason === "expired"
        ? "This download link has expired."
        : "This download link has already been used the maximum number of times.",
      410,
    );
  }

  const source = resolveAssetSource(grant.order.variant);
  const targetUrl =
    source.kind === "cloudinary"
      ? signedAssetUrl(source.publicId, source.resourceType, 5 * 60) // window to actually start the download
      : source.url;

  const forwardedFor = req.headers.get("x-forwarded-for");
  await prisma.$transaction([
    prisma.deliveryGrant.update({ where: { id: grant.id }, data: { useCount: { increment: 1 } } }),
    prisma.accessLog.create({
      data: {
        grantId: grant.id,
        ip: forwardedFor?.split(",")[0]?.trim() ?? null,
        userAgent: req.headers.get("user-agent"),
      },
    }),
  ]);

  return NextResponse.redirect(targetUrl, { status: 302 });
}

function errorPage(message: string, status: number) {
  return new NextResponse(
    `<!doctype html><html><head><meta charset="utf-8"><title>Download unavailable</title></head><body style="font-family:system-ui;max-width:32rem;margin:4rem auto;text-align:center;color:#111"><h1>Download unavailable</h1><p>${message}</p></body></html>`,
    { status, headers: { "content-type": "text/html; charset=utf-8" } },
  );
}
