import Link from "next/link";
import { fulfillOrder } from "@/lib/fulfillment";
import { formatMoney } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ reference?: string; trxref?: string }>;
}) {
  const params = await searchParams;
  const reference = params.reference ?? params.trxref;

  if (!reference) {
    return (
      <main className="shell">
        <h1>Missing reference</h1>
        <p className="muted">We couldn&apos;t find a payment reference in this link.</p>
        <Link href="/" className="btn btn-outline">
          Back to store
        </Link>
      </main>
    );
  }

  // Paystack's webhook is the source of truth and may have already fulfilled
  // this order by the time the browser lands here; fulfillOrder is idempotent
  // either way — see lib/fulfillment.ts.
  const result = await fulfillOrder(reference);

  if (result.outcome === "unknown_reference") {
    return (
      <main className="shell">
        <h1>We can&apos;t find that order</h1>
        <p className="muted">If you were just charged, contact us with reference {reference}.</p>
      </main>
    );
  }

  if (result.outcome === "not_successful") {
    return (
      <main className="shell">
        <h1>Payment not completed</h1>
        <p className="muted">Paystack reported this payment as &ldquo;{result.paystackStatus}&rdquo;. You have not been charged. You can try again.</p>
        <Link href="/" className="btn">
          Back to store
        </Link>
      </main>
    );
  }

  if (result.outcome === "amount_mismatch") {
    return (
      <main className="shell">
        <h1>Something looked wrong with this payment</h1>
        <p className="muted">
          We could not confirm this order automatically. Contact us with reference {reference} and we&apos;ll sort it
          out — no video will be released until we do.
        </p>
      </main>
    );
  }

  const { order } = result;

  return (
    <main className="shell">
      <h1>Thanks — you&apos;re all set</h1>
      <div className="notice ok">
        <p style={{ margin: 0 }}>
          <strong>
            {order.productTitle} — {order.variantName}
          </strong>
        </p>
        <p className="muted" style={{ margin: "0.35rem 0 0" }}>
          {formatMoney(order.amountKobo, order.currency)} paid
        </p>
      </div>

      {order.deliveryMethod === "DOWNLOAD" && result.downloadUrl && (
        <>
          <p>Your download is ready:</p>
          <a href={result.downloadUrl} className="btn">
            Download your video
          </a>
          <p className="muted" style={{ fontSize: "0.85rem", marginTop: "1rem" }}>
            This link works a limited number of times and will expire — save the file once you download it.
          </p>
        </>
      )}

      {order.deliveryMethod === "EMAIL" && (
        <p>
          We&apos;ve emailed the download link to <strong>{order.customerEmail}</strong>. Check your inbox (and spam
          folder) in the next few minutes.
        </p>
      )}

      <Link href="/" className="btn btn-outline" style={{ marginTop: "1.5rem" }}>
        Back to store
      </Link>
    </main>
  );
}
