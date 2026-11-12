import crypto from "crypto";
import Decimal from "decimal.js";
import { PrismaClient } from "@prisma/client";
import { env } from "../config/env";
import { ApiError } from "../lib/apiResponse";

export type CreateCheckoutInput = { bookingReference: string; paymentId: string; amount: number; currency: string; guest: { firstName: string; lastName: string; email: string; phone: string } };
export type CheckoutResult = { actionUrl: string; fields: Record<string, string> };
export type VerifiedPaymentNotification = { orderId: string; paymentId: string; amount: number; currency: string; statusCode: string; success: boolean; rawStatusCode: string };

export interface PaymentProvider {
  createCheckout(input: CreateCheckoutInput): Promise<CheckoutResult>;
  verifyNotification(input: Record<string, string>): Promise<VerifiedPaymentNotification>;
}

export class PayHerePaymentProvider implements PaymentProvider {
  private endpoint = env.PAYHERE_MODE === "live" ? "https://www.payhere.lk/pay/checkout" : "https://sandbox.payhere.lk/pay/checkout";

  async createCheckout(input: CreateCheckoutInput): Promise<CheckoutResult> {
    if (!env.PAYHERE_MERCHANT_ID || !env.PAYHERE_MERCHANT_SECRET) throw new ApiError(500, "PAYHERE_NOT_CONFIGURED", "PayHere sandbox credentials are not configured.");
    const amount = input.amount.toFixed(2);
    const hash = this.checkoutHash(input.bookingReference, amount, input.currency);
    return { actionUrl: this.endpoint, fields: { merchant_id: env.PAYHERE_MERCHANT_ID, return_url: env.PAYHERE_RETURN_URL ?? `${env.FRONTEND_URL}/book/success`, cancel_url: env.PAYHERE_CANCEL_URL ?? `${env.FRONTEND_URL}/book/cancelled`, notify_url: env.PAYHERE_NOTIFY_URL ?? `${env.API_URL}/api/v1/payments/payhere/notify`, order_id: input.bookingReference, items: "Royal Mansion Resort Villa booking", amount, currency: input.currency, first_name: input.guest.firstName, last_name: input.guest.lastName, email: input.guest.email, phone: input.guest.phone, custom_1: input.paymentId, hash } };
  }

  async verifyNotification(input: Record<string, string>): Promise<VerifiedPaymentNotification> {
    const required = ["merchant_id", "order_id", "payment_id", "payhere_amount", "payhere_currency", "status_code", "md5sig"];
    for (const key of required) if (!input[key]) throw new ApiError(400, "PAYHERE_INVALID_CALLBACK", `Missing PayHere field ${key}.`);
    if (input.merchant_id !== env.PAYHERE_MERCHANT_ID) throw new ApiError(400, "PAYHERE_MERCHANT_MISMATCH", "PayHere merchant does not match configuration.");
    const expected = this.notificationHash(input.merchant_id, input.order_id, input.payhere_amount, input.payhere_currency, input.status_code);
    const expectedBuf = Buffer.from(expected);
    const actualBuf = Buffer.from(input.md5sig.toUpperCase());
    if (expectedBuf.length !== actualBuf.length || !crypto.timingSafeEqual(expectedBuf, actualBuf)) {
      throw new ApiError(400, "PAYHERE_SIGNATURE_INVALID", "PayHere callback signature is invalid.");
    }
    return { orderId: input.order_id, paymentId: input.payment_id, amount: Number(input.payhere_amount), currency: input.payhere_currency, statusCode: input.status_code, rawStatusCode: input.status_code, success: input.status_code === "2" };
  }

  private checkoutHash(orderId: string, amount: string, currency: string) {
    const secretHash = crypto.createHash("md5").update(env.PAYHERE_MERCHANT_SECRET).digest("hex").toUpperCase();
    return crypto.createHash("md5").update(`${env.PAYHERE_MERCHANT_ID}${orderId}${amount}${currency}${secretHash}`).digest("hex").toUpperCase();
  }

  private notificationHash(merchantId: string, orderId: string, amount: string, currency: string, statusCode: string) {
    const secretHash = crypto.createHash("md5").update(env.PAYHERE_MERCHANT_SECRET).digest("hex").toUpperCase();
    return crypto.createHash("md5").update(`${merchantId}${orderId}${amount}${currency}${statusCode}${secretHash}`).digest("hex").toUpperCase();
  }
}

export async function processPayHereNotification(prisma: PrismaClient, provider: PayHerePaymentProvider, payload: Record<string, string>) {
  const verified = await provider.verifyNotification(payload);
  const payloadHash = crypto.createHash("sha256").update(JSON.stringify({ ...payload, md5sig: undefined })).digest("hex");
  return prisma.$transaction(async (tx: any) => {
    const payment = await tx.payment.findFirst({ where: { booking: { reference: verified.orderId } }, include: { booking: true } });
    if (!payment) throw new ApiError(404, "PAYMENT_NOT_FOUND", "No matching payment exists for this callback.");
    await tx.paymentEvent.upsert({ where: { provider_externalEventId: { provider: "PAYHERE", externalEventId: verified.paymentId } }, update: { status: verified.success ? "SUCCESS_DUPLICATE" : "FAILED_DUPLICATE", processedAt: new Date() }, create: { paymentId: payment.id, provider: "PAYHERE", eventType: "NOTIFY", externalEventId: verified.paymentId, payloadHash, status: verified.success ? "SUCCESS" : "FAILED", processedAt: new Date() } });
    if (payment.verified && payment.status !== "FAILED") return { payment, booking: payment.booking, duplicate: true };
    if (Number(payment.amount) !== verified.amount || payment.currency !== verified.currency) throw new ApiError(400, "PAYHERE_AMOUNT_MISMATCH", "Payment amount or currency does not match the booking.");
    const grandTotal = new Decimal(payment.booking.grandTotal.toString());
    const payAmount = new Decimal(payment.amount.toString());
    const balanceRemaining = Decimal.max(0, grandTotal.minus(payAmount));
    const status = verified.success ? (payAmount.greaterThanOrEqualTo(grandTotal) ? "PAID" : "PARTIALLY_PAID") : "FAILED";
    const bookingStatus = verified.success ? "CONFIRMED" : payment.booking.bookingStatus;
    const updated = await tx.payment.update({ where: { id: payment.id }, data: { providerPaymentId: verified.paymentId, rawStatusCode: verified.rawStatusCode, verified: verified.success, status, processedAt: new Date(), failureReason: verified.success ? null : "PayHere reported a failed payment." } });
    const booking = await tx.booking.update({
      where: { id: payment.bookingId },
      data: {
        bookingStatus,
        paymentStatus: status,
        amountPaid: verified.success ? payAmount.toFixed(2) : payment.booking.amountPaid,
        balanceDue: verified.success ? balanceRemaining.toFixed(2) : payment.booking.balanceDue,
        confirmedAt: verified.success ? (payment.booking.confirmedAt ?? new Date()) : payment.booking.confirmedAt,
      },
    });
    return { payment: updated, booking, duplicate: false };
  });
}

