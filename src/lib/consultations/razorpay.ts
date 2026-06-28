/**
 * Razorpay web checkout loader. Opens the SAME Razorpay order the backend
 * created (POST /v2/consultations/payment/create-order). NO duplicate payment
 * logic — order creation, signature verification and earnings all stay in the
 * backend; this only renders the hosted checkout and returns the signed result.
 */

const SCRIPT_URL = "https://checkout.razorpay.com/v1/checkout.js";
let loaderPromise: Promise<boolean> | null = null;

export function loadRazorpay(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if ((window as any).Razorpay) return Promise.resolve(true);
  if (loaderPromise) return loaderPromise;
  loaderPromise = new Promise<boolean>((resolve) => {
    const existing = document.querySelector(`script[src="${SCRIPT_URL}"]`) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve(true));
      existing.addEventListener("error", () => resolve(false));
      if ((window as any).Razorpay) resolve(true);
      return;
    }
    const s = document.createElement("script");
    s.src = SCRIPT_URL;
    s.async = true;
    s.onload = () => resolve(true);
    s.onerror = () => { loaderPromise = null; resolve(false); };
    document.body.appendChild(s);
  });
  return loaderPromise;
}

export interface RazorpayResult {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export interface CheckoutOrder {
  orderId: string;
  amount: number;   // paise
  currency?: string;
  keyId: string;    // Razorpay public key id from the backend
}

export interface CheckoutOptions {
  order: CheckoutOrder;
  name?: string;
  description?: string;
  prefill?: { name?: string; email?: string; contact?: string };
  notes?: Record<string, string>;
  themeColor?: string;
}

/**
 * Open Razorpay checkout for a backend-created order. Resolves with the signed
 * fields to send to /payment/verify; rejects on dismissal or failure.
 */
export function openRazorpayCheckout(opts: CheckoutOptions): Promise<RazorpayResult> {
  return new Promise(async (resolve, reject) => {
    const ok = await loadRazorpay();
    if (!ok || !(window as any).Razorpay) {
      reject(new Error("Could not load the payment gateway. Check your connection and try again."));
      return;
    }
    let settled = false;
    const rzp = new (window as any).Razorpay({
      key: opts.order.keyId,
      order_id: opts.order.orderId,
      amount: opts.order.amount,
      currency: opts.order.currency || "INR",
      name: opts.name || "DokLynk",
      description: opts.description || "Consultation",
      prefill: opts.prefill || {},
      notes: opts.notes || {},
      theme: { color: opts.themeColor || "#1E7B74" },
      handler: (res: RazorpayResult) => {
        settled = true;
        resolve(res);
      },
      modal: {
        ondismiss: () => {
          if (!settled) reject(new Error("Payment cancelled."));
        },
      },
    });
    rzp.on("payment.failed", (resp: any) => {
      settled = true;
      reject(new Error(resp?.error?.description || "Payment failed."));
    });
    rzp.open();
  });
}
