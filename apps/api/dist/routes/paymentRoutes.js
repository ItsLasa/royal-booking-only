"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentRoutes = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const prisma_1 = require("../lib/prisma");
const apiResponse_1 = require("../lib/apiResponse");
const validation_1 = require("../middleware/validation");
const payhere_1 = require("../payment-providers/payhere");
const emailService_1 = require("../services/emailService");
exports.paymentRoutes = (0, express_1.Router)();
const provider = new payhere_1.PayHerePaymentProvider();
// Anti-abuse rate limiter for bank transfer / slip submissions (max 15 submissions per 15 minutes per IP)
const bankTransferLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    limit: 15,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: {
            code: "RATE_LIMIT_EXCEEDED",
            message: "Too many payment submission attempts. Please try again later.",
        },
    },
});
const ALLOWED_SLIP_MIME_TYPES = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/jpg",
    "application/pdf",
]);
function validateSlipBuffer(buf) {
    if (buf.length < 4)
        return { valid: false, ext: "" };
    // JPEG: FF D8 FF
    if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
        return { valid: true, ext: ".jpg" };
    }
    // PNG: 89 50 4E 47
    if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
        return { valid: true, ext: ".png" };
    }
    // WebP: RIFF .... WEBP
    if (buf.length >= 12 &&
        buf[0] === 0x52 &&
        buf[1] === 0x49 &&
        buf[2] === 0x46 &&
        buf[3] === 0x46 &&
        buf.toString("ascii", 8, 12) === "WEBP") {
        return { valid: true, ext: ".webp" };
    }
    // PDF: %PDF
    if (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) {
        return { valid: true, ext: ".pdf" };
    }
    return { valid: false, ext: "" };
}
const payhereCreateSchema = zod_1.z.object({
    reference: zod_1.z.string().min(1, "Booking reference is required"),
    email: zod_1.z.string().email().optional(),
});
const bankTransferSchema = zod_1.z.object({
    reference: zod_1.z.string().min(1, "Booking reference is required"),
    bankReference: zod_1.z.string().max(500).optional(),
    email: zod_1.z.string().email("Guest email is required for payment verification"),
    slipFile: zod_1.z
        .object({
        base64: zod_1.z.string().min(1, "File content is required"),
        name: zod_1.z.string().min(1, "File name is required"),
        type: zod_1.z.string().min(1, "File type is required"),
    })
        .optional(),
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
exports.paymentRoutes.post("/payments/bank-transfer", bankTransferLimiter, (0, validation_1.validateBody)(bankTransferSchema), async (req, res, next) => {
    try {
        const existing = await prisma_1.prisma.booking.findUnique({
            where: { reference: req.body.reference },
            include: { payments: true, guest: true },
        });
        if (!existing) {
            throw new apiResponse_1.ApiError(404, "BOOKING_NOT_FOUND", "Booking reference not found.");
        }
        if (!req.body.email || req.body.email.trim().toLowerCase() !== existing.guest.email.toLowerCase()) {
            throw new apiResponse_1.ApiError(403, "EMAIL_MISMATCH", "Email does not match booking records.");
        }
        // State machine guard: Do not allow modifying confirmed or finalized bookings
        if (!["HOLD", "PENDING_PAYMENT"].includes(existing.bookingStatus)) {
            throw new apiResponse_1.ApiError(400, "INVALID_BOOKING_STATUS", `Cannot submit bank transfer reference for a booking with status '${existing.bookingStatus}'.`);
        }
        let slipUrl = undefined;
        if (req.body.slipFile && req.body.slipFile.base64) {
            const fileType = String(req.body.slipFile.type).toLowerCase().trim();
            if (!ALLOWED_SLIP_MIME_TYPES.has(fileType)) {
                throw new apiResponse_1.ApiError(400, "INVALID_FILE_TYPE", "Only JPG, PNG, WEBP, or PDF files are allowed.");
            }
            const base64Data = req.body.slipFile.base64.replace(/^data:.*?;base64,/, "");
            const fileBuffer = Buffer.from(base64Data, "base64");
            if (fileBuffer.length > 10 * 1024 * 1024) {
                throw new apiResponse_1.ApiError(400, "FILE_TOO_LARGE", "File size cannot exceed 10MB.");
            }
            const verification = validateSlipBuffer(fileBuffer);
            if (!verification.valid) {
                throw new apiResponse_1.ApiError(400, "INVALID_FILE_CONTENT", "Uploaded file headers do not match a valid image or PDF document.");
            }
            try {
                const uploadsDir = path_1.default.resolve(process.cwd(), "public/uploads/slips");
                if (!fs_1.default.existsSync(uploadsDir))
                    fs_1.default.mkdirSync(uploadsDir, { recursive: true });
                const safeRef = existing.reference.replace(/[^a-zA-Z0-9_-]/g, "");
                const fileName = `slip_${safeRef}_${Date.now()}${verification.ext}`;
                const filePath = path_1.default.join(uploadsDir, fileName);
                fs_1.default.writeFileSync(filePath, fileBuffer);
                slipUrl = `/uploads/slips/${fileName}`;
            }
            catch (fileErr) {
                console.warn("⚠️ Failed to write slip file to disk:", fileErr);
            }
        }
        const bankRef = req.body.bankReference?.trim() || (slipUrl ? "Slip uploaded" : "Bank Transfer submitted");
        const noteEntry = `[${new Date().toISOString()}] Bank transfer / slip submitted: ${bankRef}${slipUrl ? ` (File: ${slipUrl})` : ""}`;
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
            const providerOrderId = slipUrl ? `${bankRef} | ${slipUrl}` : bankRef;
            // Check if an existing unpaid payment can be transitioned or create a new BANK_TRANSFER payment
            const existingUnpaidPayment = existing.payments.find((p) => !p.verified && p.status !== "PAID");
            if (existingUnpaidPayment) {
                await tx.payment.update({
                    where: { id: existingUnpaidPayment.id },
                    data: {
                        provider: "BANK_TRANSFER",
                        paymentMethod: "Bank transfer",
                        providerOrderId,
                        providerPaymentId: slipUrl || existingUnpaidPayment.providerPaymentId || null,
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
                        providerOrderId,
                        providerPaymentId: slipUrl || null,
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
                    newValues: { bankReference: bankRef, slipUrl },
                },
            });
            return booking;
        });
        // Automatically dispatch booking summary email to guest
        await (0, emailService_1.sendBookingSummaryEmail)(prisma_1.prisma, result.id).catch((emailErr) => {
            console.warn("⚠️ Failed to send booking summary email:", emailErr);
        });
        res.json((0, apiResponse_1.ok)({
            reference: result.reference,
            status: result.bookingStatus,
            message: "Your booking has been successfully submitted!",
            slipUrl,
        }));
    }
    catch (e) {
        next(e);
    }
});
