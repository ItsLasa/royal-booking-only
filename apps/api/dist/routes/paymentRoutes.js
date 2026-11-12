"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentRoutes = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const apiResponse_1 = require("../lib/apiResponse");
const validation_1 = require("../middleware/validation");
const payhere_1 = require("../payment-providers/payhere");
exports.paymentRoutes = (0, express_1.Router)();
const provider = new payhere_1.PayHerePaymentProvider();
const payhereCreateSchema = zod_1.z.object({
    reference: zod_1.z.string().min(1, "Booking reference is required"),
    email: zod_1.z.string().email().optional(),
});
const bankTransferSchema = zod_1.z.object({
    reference: zod_1.z.string().min(1, "Booking reference is required"),
    bankReference: zod_1.z.string().min(1, "Bank transfer reference is required").max(200),
    email: zod_1.z.string().email().optional(),
});
exports.paymentRoutes.post("/payments/payhere/create", (0, validation_1.validateBody)(payhereCreateSchema), async (req, res, next) => {
    try {
        const booking = await prisma_1.prisma.booking.findUnique({
            where: { reference: req.body.reference },
            include: { guest: true, payments: true },
        });
        if (!booking) {
            throw new apiResponse_1.ApiError(404, "BOOKING_NOT_FOUND", "Booking was not found.");
        }
        const payment = booking.payments[0];
        if (!payment) {
            throw new apiResponse_1.ApiError(400, "NO_PENDING_PAYMENT", "No payment record found for this booking.");
        }
        if (booking.bookingStatus === "CONFIRMED" && booking.paymentStatus === "PAID") {
            throw new apiResponse_1.ApiError(400, "ALREADY_PAID", "This booking is already paid and confirmed.");
        }
        const checkout = await provider.createCheckout({
            bookingReference: booking.reference,
            paymentId: payment.id,
            amount: Number(payment.amount),
            currency: payment.currency,
            guest: booking.guest,
        });
        await prisma_1.prisma.payment.update({
            where: { id: payment.id },
            data: { providerOrderId: booking.reference },
        });
        res.json((0, apiResponse_1.ok)(checkout));
    }
    catch (e) {
        next(e);
    }
});
exports.paymentRoutes.post("/payments/payhere/notify", (0, express_1.urlencoded)({ extended: false }), async (req, res, next) => {
    try {
        const result = await (0, payhere_1.processPayHereNotification)(prisma_1.prisma, provider, req.body);
        res.json((0, apiResponse_1.ok)({ processed: true, duplicate: result.duplicate }));
    }
    catch (e) {
        next(e);
    }
});
exports.paymentRoutes.post("/payments/bank-transfer", (0, validation_1.validateBody)(bankTransferSchema), async (req, res, next) => {
    try {
        const existing = await prisma_1.prisma.booking.findUnique({
            where: { reference: req.body.reference },
            include: { payments: true, guest: true },
        });
        if (!existing) {
            throw new apiResponse_1.ApiError(404, "BOOKING_NOT_FOUND", "Booking reference not found.");
        }
        if (req.body.email && req.body.email.toLowerCase() !== existing.guest.email.toLowerCase()) {
            throw new apiResponse_1.ApiError(403, "EMAIL_MISMATCH", "Email does not match booking records.");
        }
        // State machine guard: Do not allow modifying confirmed or finalized bookings
        if (!["HOLD", "PENDING_PAYMENT"].includes(existing.bookingStatus)) {
            throw new apiResponse_1.ApiError(400, "INVALID_BOOKING_STATUS", `Cannot submit bank transfer reference for a booking with status '${existing.bookingStatus}'.`);
        }
        const bankRef = req.body.bankReference.trim();
        const noteEntry = `[${new Date().toISOString()}] Bank transfer reference submitted: ${bankRef}`;
        const updatedNotes = existing.internalNotes
            ? `${existing.internalNotes}\n${noteEntry}`
            : noteEntry;
        // Update booking and ensure a BANK_TRANSFER payment record exists for admin verification
        const result = await prisma_1.prisma.$transaction(async (tx) => {
            const booking = await tx.booking.update({
                where: { reference: req.body.reference },
                data: {
                    bookingStatus: "PENDING_PAYMENT",
                    paymentStatus: "UNPAID",
                    internalNotes: updatedNotes,
                },
            });
            // Check if an existing unpaid payment can be transitioned or create a new BANK_TRANSFER payment
            const existingUnpaidPayment = existing.payments.find((p) => !p.verified && p.status !== "PAID");
            if (existingUnpaidPayment) {
                await tx.payment.update({
                    where: { id: existingUnpaidPayment.id },
                    data: {
                        provider: "BANK_TRANSFER",
                        paymentMethod: "Bank transfer",
                        providerOrderId: bankRef,
                        status: "UNPAID",
                    },
                });
            }
            else {
                await tx.payment.create({
                    data: {
                        bookingId: existing.id,
                        provider: "BANK_TRANSFER",
                        paymentMethod: "Bank transfer",
                        providerOrderId: bankRef,
                        amount: existing.depositRequired,
                        currency: existing.currency,
                        status: "UNPAID",
                        verified: false,
                        idempotencyKey: `BT-${existing.reference}-${Date.now()}`,
                    },
                });
            }
            await tx.auditLog.create({
                data: {
                    action: "BANK_TRANSFER_REFERENCE_SUBMITTED",
                    entityType: "Booking",
                    entityId: booking.reference,
                    newValues: { bankReference: bankRef },
                },
            });
            return booking;
        });
        res.json((0, apiResponse_1.ok)({ reference: result.reference, status: result.bookingStatus }));
    }
    catch (e) {
        next(e);
    }
});
