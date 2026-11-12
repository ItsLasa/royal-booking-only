import { Prisma, PrismaClient } from "@prisma/client";
import Decimal from "decimal.js";
import { ApiError } from "../lib/apiResponse";
import { writeAudit, AdminActor, AuditMeta } from "../lib/audit";

export type PaymentListQuery = { page?: number; pageSize?: number; status?: string; provider?: string; search?: string };

export async function listPayments(prisma: PrismaClient, query: PaymentListQuery) {
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
  const where: Prisma.PaymentWhereInput = {
    ...(query.status ? { status: query.status as never } : {}),
    ...(query.provider ? { provider: query.provider as never } : {}),
    ...(query.search ? { booking: { reference: { contains: query.search } } } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.payment.findMany({ where, include: { booking: { include: { guest: true } }, events: true }, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.payment.count({ where }),
  ]);
  return { items, total, page, pageSize, pages: Math.ceil(total / pageSize) };
}

export async function getPaymentDetail(prisma: PrismaClient, id: string) {
  const payment = await prisma.payment.findUnique({ where: { id }, include: { booking: { include: { guest: true, package: true } }, events: true } });
  if (!payment) throw new ApiError(404, "PAYMENT_NOT_FOUND", "Payment not found.");
  return payment;
}

export async function verifyPayment(prisma: PrismaClient, actor: AdminActor, id: string, meta?: AuditMeta) {
  const payment = await prisma.payment.findUnique({ where: { id }, include: { booking: true } });
  if (!payment) throw new ApiError(404, "PAYMENT_NOT_FOUND", "Payment not found.");
  if (payment.provider !== "BANK_TRANSFER" && payment.provider !== "CASH") throw new ApiError(409, "PROVIDER_VERIFY_FORBIDDEN", "Only bank-transfer and cash payments can be manually verified.");
  if (payment.verified) throw new ApiError(409, "ALREADY_VERIFIED", "This payment is already verified.");

  const updated = await prisma.$transaction(async (tx: any) => {
    const pay = await tx.payment.update({ where: { id }, data: { verified: true, status: "PAID", processedAt: new Date() }, include: { booking: true } });
    const paid = new Decimal(pay.booking.amountPaid.toString()).plus(pay.amount.toString());
    const amountPaid = paid.toFixed(2);
    const balanceDue = new Decimal(pay.booking.grandTotal.toString()).minus(amountPaid);
    const paymentStatus = balanceDue.lte(0) ? "PAID" : "PARTIALLY_PAID";
    const booking = await tx.booking.update({
      where: { id: pay.bookingId },
      data: { amountPaid, balanceDue: balanceDue.toFixed(2), paymentStatus, bookingStatus: "CONFIRMED", confirmedAt: pay.booking.confirmedAt ?? new Date() },
    });
    await tx.auditLog.create({ data: { adminUserId: actor.id, action: "PAYMENT_VERIFIED", entityType: "Payment", entityId: pay.id, oldValues: { verified: false }, newValues: { verified: true, amount: pay.amount }, ipAddress: meta?.ipAddress, userAgent: meta?.userAgent } });
    return { pay, booking };
  });

  return updated;
}

export async function recordManualPayment(prisma: PrismaClient, actor: AdminActor, input: { bookingId: string; amount: string | number; provider?: "CASH" | "BANK_TRANSFER"; paymentMethod?: string; note?: string }, meta?: AuditMeta) {
  const booking = await prisma.booking.findUnique({ where: { id: input.bookingId } });
  if (!booking) throw new ApiError(404, "BOOKING_NOT_FOUND", "Booking not found.");
  const amount = new Decimal(input.amount.toString());
  if (amount.lte(0)) throw new ApiError(400, "INVALID_AMOUNT", "Amount must be greater than zero.");

  const provider = input.provider ?? "CASH";
  const payment = await prisma.$transaction(async (tx: any) => {
    const pay = await tx.payment.create({
      data: {
        bookingId: booking.id,
        provider,
        idempotencyKey: `${booking.reference}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        amount: amount.toFixed(2),
        currency: booking.currency,
        status: "PAID",
        paymentMethod: input.paymentMethod ?? (provider === "CASH" ? "Cash" : "Bank transfer"),
        verified: true,
        processedAt: new Date(),
      },
    });
    const paid = new Decimal(booking.amountPaid.toString()).plus(amount);
    const amountPaid = paid.toFixed(2);
    const balanceDue = new Decimal(booking.grandTotal.toString()).minus(amountPaid);
    const paymentStatus = balanceDue.lte(0) ? "PAID" : "PARTIALLY_PAID";
    const updatedBooking = await tx.booking.update({
      where: { id: booking.id },
      data: { amountPaid, balanceDue: balanceDue.toFixed(2), paymentStatus, bookingStatus: booking.bookingStatus === "HOLD" ? "CONFIRMED" : booking.bookingStatus, confirmedAt: booking.confirmedAt ?? (booking.bookingStatus === "HOLD" ? new Date() : undefined) },
    });
    await tx.auditLog.create({ data: { adminUserId: actor.id, action: "PAYMENT_RECORDED", entityType: "Payment", entityId: pay.id, newValues: { provider, amount: pay.amount, note: input.note ?? null }, ipAddress: meta?.ipAddress, userAgent: meta?.userAgent } });
    return { payment: pay, booking: updatedBooking };
  });

  return payment;
}

export async function refundPayment(prisma: PrismaClient, actor: AdminActor, id: string, input: { amount?: string | number; reason?: string }, meta?: AuditMeta) {
  const payment = await prisma.payment.findUnique({ where: { id }, include: { booking: true } });
  if (!payment) throw new ApiError(404, "PAYMENT_NOT_FOUND", "Payment not found.");
  if (!payment.verified || payment.status === "REFUNDED") throw new ApiError(409, "NOT_REFUNDABLE", "This payment cannot be refunded.");

  const currentPaid = new Decimal(payment.booking.amountPaid.toString());
  if (currentPaid.lte(0)) {
    throw new ApiError(400, "NO_FUNDS_TO_REFUND", "No paid amount remains on this booking to refund.");
  }

  const refundAmount = input.amount ? new Decimal(input.amount.toString()) : new Decimal(payment.amount.toString());
  if (refundAmount.lte(0) || refundAmount.gt(payment.amount.toString()) || refundAmount.gt(currentPaid)) {
    throw new ApiError(400, "INVALID_AMOUNT", `Refund amount of ${refundAmount.toFixed(2)} exceeds remaining refundable balance of ${currentPaid.toFixed(2)}.`);
  }

  const updated = await prisma.$transaction(async (tx: any) => {
    const isFullRefund = refundAmount.equals(payment.amount.toString()) || refundAmount.equals(currentPaid);
    const pay = await tx.payment.update({
      where: { id },
      data: {
        status: isFullRefund ? "REFUNDED" : "PARTIALLY_REFUNDED",
        failureReason: input.reason ?? null,
      },
      include: { booking: true },
    });
    const paid = currentPaid.minus(refundAmount);
    const amountPaid = paid.lte(0) ? "0" : paid.toFixed(2);
    const balanceDue = new Decimal(pay.booking.grandTotal.toString()).minus(amountPaid);
    const paymentStatus = paid.lte(0) ? "REFUNDED" : "PARTIALLY_REFUNDED";
    const booking = await tx.booking.update({
      where: { id: pay.bookingId },
      data: {
        amountPaid,
        balanceDue: balanceDue.toFixed(2),
        paymentStatus,
      },
    });
    await tx.auditLog.create({
      data: {
        adminUserId: actor.id,
        action: "PAYMENT_REFUNDED",
        entityType: "Payment",
        entityId: pay.id,
        oldValues: { status: payment.status },
        newValues: { status: pay.status, amount: refundAmount.toFixed(2), reason: input.reason ?? null },
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
      },
    });
    return { payment: pay, booking };
  });

  return updated;
}
