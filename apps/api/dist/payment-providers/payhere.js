"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PayHerePaymentProvider = void 0;
exports.processPayHereNotification = processPayHereNotification;
const crypto_1 = __importDefault(require("crypto"));
const decimal_js_1 = __importDefault(require("decimal.js"));
const env_1 = require("../config/env");
const apiResponse_1 = require("../lib/apiResponse");
class PayHerePaymentProvider {
    endpoint = env_1.env.PAYHERE_MODE === "live" ? "https://www.payhere.lk/pay/checkout" : "https://sandbox.payhere.lk/pay/checkout";
    async createCheckout(input) {
        if (!env_1.env.PAYHERE_MERCHANT_ID || !env_1.env.PAYHERE_MERCHANT_SECRET)
            throw new apiResponse_1.ApiError(500, "PAYHERE_NOT_CONFIGURED", "PayHere sandbox credentials are not configured.");
        const amount = input.amount.toFixed(2);
        const hash = this.checkoutHash(input.bookingReference, amount, input.currency);
        return { actionUrl: this.endpoint, fields: { merchant_id: env_1.env.PAYHERE_MERCHANT_ID, return_url: env_1.env.PAYHERE_RETURN_URL ?? `${env_1.env.FRONTEND_URL}/book/success`, cancel_url: env_1.env.PAYHERE_CANCEL_URL ?? `${env_1.env.FRONTEND_URL}/book/cancelled`, notify_url: env_1.env.PAYHERE_NOTIFY_URL ?? `${env_1.env.API_URL}/api/v1/payments/payhere/notify`, order_id: input.bookingReference, items: "Royal Mansion Resort Villa booking", amount, currency: input.currency, first_name: input.guest.firstName, last_name: input.guest.lastName, email: input.guest.email, phone: input.guest.phone, custom_1: input.paymentId, hash } };
    }
    async verifyNotification(input) {
        const required = ["merchant_id", "order_id", "payment_id", "payhere_amount", "payhere_currency", "status_code", "md5sig"];
        for (const key of required)
            if (!input[key])
                throw new apiResponse_1.ApiError(400, "PAYHERE_INVALID_CALLBACK", `Missing PayHere field ${key}.`);
        if (input.merchant_id !== env_1.env.PAYHERE_MERCHANT_ID)
            throw new apiResponse_1.ApiError(400, "PAYHERE_MERCHANT_MISMATCH", "PayHere merchant does not match configuration.");
        const expected = this.notificationHash(input.merchant_id, input.order_id, input.payhere_amount, input.payhere_currency, input.status_code);
        const expectedBuf = Buffer.from(expected);
        const actualBuf = Buffer.from(input.md5sig.toUpperCase());
        if (expectedBuf.length !== actualBuf.length || !crypto_1.default.timingSafeEqual(expectedBuf, actualBuf)) {
            throw new apiResponse_1.ApiError(400, "PAYHERE_SIGNATURE_INVALID", "PayHere callback signature is invalid.");
        }
        return { orderId: input.order_id, paymentId: input.payment_id, amount: Number(input.payhere_amount), currency: input.payhere_currency, statusCode: input.status_code, rawStatusCode: input.status_code, success: input.status_code === "2" };
    }
    checkoutHash(orderId, amount, currency) {
        const secretHash = crypto_1.default.createHash("md5").update(env_1.env.PAYHERE_MERCHANT_SECRET).digest("hex").toUpperCase();
        return crypto_1.default.createHash("md5").update(`${env_1.env.PAYHERE_MERCHANT_ID}${orderId}${amount}${currency}${secretHash}`).digest("hex").toUpperCase();
    }
    notificationHash(merchantId, orderId, amount, currency, statusCode) {
        const secretHash = crypto_1.default.createHash("md5").update(env_1.env.PAYHERE_MERCHANT_SECRET).digest("hex").toUpperCase();
        return crypto_1.default.createHash("md5").update(`${merchantId}${orderId}${amount}${currency}${statusCode}${secretHash}`).digest("hex").toUpperCase();
    }
}
exports.PayHerePaymentProvider = PayHerePaymentProvider;
async function processPayHereNotification(prisma, provider, payload) {
    const verified = await provider.verifyNotification(payload);
    const payloadHash = crypto_1.default.createHash("sha256").update(JSON.stringify({ ...payload, md5sig: undefined })).digest("hex");
    return prisma.$transaction(async (tx) => {
        const payment = await tx.payment.findFirst({ where: { booking: { reference: verified.orderId } }, include: { booking: true } });
        if (!payment)
            throw new apiResponse_1.ApiError(404, "PAYMENT_NOT_FOUND", "No matching payment exists for this callback.");
        await tx.paymentEvent.upsert({ where: { provider_externalEventId: { provider: "PAYHERE", externalEventId: verified.paymentId } }, update: { status: verified.success ? "SUCCESS_DUPLICATE" : "FAILED_DUPLICATE", processedAt: new Date() }, create: { paymentId: payment.id, provider: "PAYHERE", eventType: "NOTIFY", externalEventId: verified.paymentId, payloadHash, status: verified.success ? "SUCCESS" : "FAILED", processedAt: new Date() } });
        if (payment.verified && payment.status !== "FAILED")
            return { payment, booking: payment.booking, duplicate: true };
        if (Number(payment.amount) !== verified.amount || payment.currency !== verified.currency)
            throw new apiResponse_1.ApiError(400, "PAYHERE_AMOUNT_MISMATCH", "Payment amount or currency does not match the booking.");
        const grandTotal = new decimal_js_1.default(payment.booking.grandTotal.toString());
        const payAmount = new decimal_js_1.default(payment.amount.toString());
        const balanceRemaining = decimal_js_1.default.max(0, grandTotal.minus(payAmount));
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
