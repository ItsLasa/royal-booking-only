import { Router, urlencoded } from "express";
import { z } from "zod";
import fs from "fs";
import path from "path";
import rateLimit from "express-rate-limit";
import { prisma } from "../lib/prisma";
import { ApiError, ok } from "../lib/apiResponse";
import { validateBody } from "../middleware/validation";
import { PayHerePaymentProvider, processPayHereNotification } from "../payment-providers/payhere";
import { sendBookingSummaryEmail } from "../services/emailService";

export const paymentRoutes = Router();
const provider = new PayHerePaymentProvider();

// Anti-abuse rate limiter for bank transfer / slip submissions (max 15 submissions per 15 minutes per IP)
const bankTransferLimiter = rateLimit({
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

function validateSlipBuffer(buf: Buffer): { valid: boolean; ext: string } {
  if (buf.length < 4) return { valid: false, ext: "" };
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return { valid: true, ext: ".jpg" };
  }
  // PNG: 89 50 4E 47
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return { valid: true, ext: ".png" };
  }
  // WebP: RIFF .... WEBP
  if (
    buf.length >= 12 &&
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf.toString("ascii", 8, 12) === "WEBP"
  ) {
    return { valid: true, ext: ".webp" };
  }
  // PDF: %PDF
  if (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) {
    return { valid: true, ext: ".pdf" };
  }
  return { valid: false, ext: "" };
}

const payhereCreateSchema = z.object({
  reference: z.string().min(1, "Booking reference is required"),
  email: z.string().email().optional(),
});

const bankTransferSchema = z.object({
  reference: z.string().min(1, "Booking reference is required"),
  bankReference: z.string().max(500).optional(),
  email: z.string().email("Guest email is required for payment verification"),
  slipFile: z
    .object({
      base64: z.string().min(1, "File content is required"),
      name: z.string().min(1, "File name is required"),
      type: z.string().min(1, "File type is required"),
    })
    .optional(),
});

paymentRoutes.post(
  "/payments/payhere/create",
  validateBody(payhereCreateSchema),
  async (req, res, next) => {
    try {
      const booking = await prisma.booking.findUnique({
        where: { reference: req.body.reference },
        include: { guest: true, payments: true },
      });

      if (!booking) {
        throw new ApiError(404, "BOOKING_NOT_FOUND", "Booking was not found.");
      }

      const payment = booking.payments[0];
      if (!payment) {
        throw new ApiError(400, "NO_PENDING_PAYMENT", "No payment record found for this booking.");
      }

      if (booking.bookingStatus === "CONFIRMED" && booking.paymentStatus === "PAID") {
        throw new ApiError(400, "ALREADY_PAID", "This booking is already paid and confirmed.");
      }

      const checkout = await provider.createCheckout({
        bookingReference: booking.reference,
        paymentId: payment.id,
        amount: Number(payment.amount),
        currency: payment.currency,
        guest: booking.guest,
      });

      await prisma.payment.update({
        where: { id: payment.id },
        data: { providerOrderId: booking.reference },
      });

      res.json(ok(checkout));
    } catch (e) {
      next(e);
    }
  }
);

paymentRoutes.post(
  "/payments/payhere/notify",
  urlencoded({ extended: false }),
  async (req, res, next) => {
    try {
      const result = await processPayHereNotification(prisma, provider, req.body);
      res.json(ok({ processed: true, duplicate: result.duplicate }));
    } catch (e) {
      next(e);
    }
  }
);

paymentRoutes.post(
  "/payments/bank-transfer",
  bankTransferLimiter,
  validateBody(bankTransferSchema),
  async (req, res, next) => {
    try {
      const existing = await prisma.booking.findUnique({
        where: { reference: req.body.reference },
        include: { payments: true, guest: true },
      });

      if (!existing) {
        throw new ApiError(404, "BOOKING_NOT_FOUND", "Booking reference not found.");
      }

      if (!req.body.email || req.body.email.trim().toLowerCase() !== existing.guest.email.toLowerCase()) {
        throw new ApiError(403, "EMAIL_MISMATCH", "Email does not match booking records.");
      }

      // State machine guard: Do not allow modifying confirmed or finalized bookings
      if (!["HOLD", "PENDING_PAYMENT"].includes(existing.bookingStatus)) {
        throw new ApiError(
          400,
          "INVALID_BOOKING_STATUS",
          `Cannot submit bank transfer reference for a booking with status '${existing.bookingStatus}'.`
        );
      }

      let slipUrl: string | undefined = undefined;
      if (req.body.slipFile && req.body.slipFile.base64) {
        const fileType = String(req.body.slipFile.type).toLowerCase().trim();
        if (!ALLOWED_SLIP_MIME_TYPES.has(fileType)) {
          throw new ApiError(400, "INVALID_FILE_TYPE", "Only JPG, PNG, WEBP, or PDF files are allowed.");
        }

        const base64Data = req.body.slipFile.base64.replace(/^data:.*?;base64,/, "");
        const fileBuffer = Buffer.from(base64Data, "base64");

        if (fileBuffer.length > 10 * 1024 * 1024) {
          throw new ApiError(400, "FILE_TOO_LARGE", "File size cannot exceed 10MB.");
        }

        const verification = validateSlipBuffer(fileBuffer);
        if (!verification.valid) {
          throw new ApiError(
            400,
            "INVALID_FILE_CONTENT",
            "Uploaded file headers do not match a valid image or PDF document."
          );
        }

        try {
          const uploadsDir = path.resolve(process.cwd(), "public/uploads/slips");
          if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

          const safeRef = existing.reference.replace(/[^a-zA-Z0-9_-]/g, "");
          const fileName = `slip_${safeRef}_${Date.now()}${verification.ext}`;
          const filePath = path.join(uploadsDir, fileName);

          fs.writeFileSync(filePath, fileBuffer);
          slipUrl = `/uploads/slips/${fileName}`;
        } catch (fileErr) {
          console.warn("⚠️ Failed to write slip file to disk:", fileErr);
        }
      }

      const bankRef = req.body.bankReference?.trim() || (slipUrl ? "Slip uploaded" : "Bank Transfer submitted");
      const noteEntry = `[${new Date().toISOString()}] Bank transfer / slip submitted: ${bankRef}${
        slipUrl ? ` (File: ${slipUrl})` : ""
      }`;
      const updatedNotes = existing.internalNotes
        ? `${existing.internalNotes}\n${noteEntry}`
        : noteEntry;

      // Update booking and ensure a BANK_TRANSFER payment record exists for admin verification
      const result = await prisma.$transaction(async (tx) => {
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
        } else {
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
      await sendBookingSummaryEmail(prisma, result.id).catch((emailErr) => {
        console.warn("⚠️ Failed to send booking summary email:", emailErr);
      });

      res.json(
        ok({
          reference: result.reference,
          status: result.bookingStatus,
          message: "Your booking has been successfully submitted!",
          slipUrl,
        })
      );
    } catch (e) {
      next(e);
    }
  }
);
