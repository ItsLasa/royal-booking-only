import { Prisma, PrismaClient } from "@prisma/client";
import Decimal from "decimal.js";
import { addDays } from "date-fns";
import { ApiError } from "../lib/apiResponse";
import { writeAudit, AdminActor, AuditMeta } from "../lib/audit";
import { createBookingReference } from "../lib/references";
import { dateKey, nightsBetween, occupiedNights } from "../lib/dates";
import { assertAvailable } from "./availabilityService";
import { calculateQuote, QuoteInput, quoteSchema } from "./pricingService";

export type BookingListQuery = {
  page?: number;
  pageSize?: number;
  status?: string;
  paymentStatus?: string;
  search?: string;
  from?: string;
  to?: string;
  sort?: string;
};

const bookingInclude = {
  guest: true,
  package: { include: { unit: true } },
  unit: true,
  payments: { include: { events: true } },
  addOns: { include: { addOn: true } },
  priceLines: true,
} satisfies Prisma.BookingInclude;

export async function listBookings(prisma: PrismaClient, query: BookingListQuery) {
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
  const where: Prisma.BookingWhereInput = {
    ...(query.status ? { bookingStatus: query.status as never } : {}),
    ...(query.paymentStatus ? { paymentStatus: query.paymentStatus as never } : {}),
    ...(query.from || query.to ? { checkInDate: { ...(query.from ? { gte: new Date(`${query.from}T00:00:00.000Z`) } : {}), ...(query.to ? { lte: new Date(`${query.to}T00:00:00.000Z`) } : {}) } } : {}),
    ...(query.search
      ? {
          OR: [
            { reference: { contains: query.search } },
            { guest: { OR: [{ firstName: { contains: query.search } }, { lastName: { contains: query.search } }, { email: { contains: query.search } }, { phone: { contains: query.search } }] } },
          ],
        }
      : {}),
  };
  const [items, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      include: bookingInclude,
      orderBy: { [query.sort === "checkInDate" ? "checkInDate" : "createdAt"]: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.booking.count({ where }),
  ]);

  const enrichedItems = items.map((b: any) => {
    let slipUrl: string | null = null;
    if (b.internalNotes) {
      const match = String(b.internalNotes).match(/\/uploads\/[^\s\)]+/);
      if (match) slipUrl = match[0];
    }
    if (!slipUrl && b.payments?.length) {
      for (const p of b.payments) {
        if (p.providerPaymentId && String(p.providerPaymentId).startsWith("/uploads/")) {
          slipUrl = p.providerPaymentId;
          break;
        }
        if (p.providerOrderId && String(p.providerOrderId).includes("/uploads/")) {
          const m = String(p.providerOrderId).match(/\/uploads\/[^\s|]+/);
          if (m) {
            slipUrl = m[0];
            break;
          }
        }
      }
    }
    return { ...b, slipUrl };
  });

  return { items: enrichedItems, total, page, pageSize, pages: Math.ceil(total / pageSize) };
}

export async function getBookingDetail(prisma: PrismaClient, id: string) {
  const booking = await prisma.booking.findUnique({ where: { id }, include: { ...bookingInclude, property: true } });
  if (!booking) throw new ApiError(404, "BOOKING_NOT_FOUND", "Booking not found.");
  const audit = await prisma.auditLog.findMany({ where: { entityType: "Booking", entityId: booking.reference }, include: { adminUser: true }, orderBy: { createdAt: "desc" }, take: 50 });

  let bookingSlipUrl: string | null = null;
  if (booking.internalNotes) {
    const match = String(booking.internalNotes).match(/\/uploads\/[^\s\)]+/);
    if (match) bookingSlipUrl = match[0];
  }

  const enrichedPayments = booking.payments.map((p: any) => {
    let pSlipUrl: string | null = null;
    let bankReference: string | null = null;

    if (p.providerPaymentId && String(p.providerPaymentId).startsWith("/uploads/")) {
      pSlipUrl = p.providerPaymentId;
    }
    if (p.providerOrderId) {
      const raw = String(p.providerOrderId);
      const match = raw.match(/\/uploads\/[^\s|]+/);
      if (match) pSlipUrl = match[0];

      if (raw.includes("|")) {
        const parts = raw.split("|").map((x) => x.trim());
        bankReference = parts.find((x) => !x.startsWith("/uploads/")) || null;
      } else if (!raw.startsWith("/uploads/")) {
        bankReference = raw;
      }
    }
    if (!pSlipUrl && bookingSlipUrl) {
      pSlipUrl = bookingSlipUrl;
    }
    if (pSlipUrl && !bookingSlipUrl) {
      bookingSlipUrl = pSlipUrl;
    }
    return { ...p, slipUrl: pSlipUrl, bankReference };
  });

  if (!bookingSlipUrl && audit.length) {
    for (const a of audit) {
      const nv = a.newValues as any;
      if (nv && typeof nv === "object" && nv.slipUrl) {
        bookingSlipUrl = nv.slipUrl;
        break;
      }
    }
  }

  return { ...booking, slipUrl: bookingSlipUrl, payments: enrichedPayments, auditTrail: audit };
}

export async function createManualBooking(prisma: PrismaClient, actor: AdminActor, input: QuoteInput & { guest: { firstName: string; lastName: string; email: string; phone: string; country?: string; address?: string }; specialRequests?: string; internalNotes?: string; source?: string }, meta?: AuditMeta) {
  const quote = await calculateQuote(prisma, input);
  const checkInDate = new Date(`${input.checkInDate}T00:00:00.000Z`);
  const checkOutDate = new Date(`${input.checkOutDate}T00:00:00.000Z`);
  const booking = await prisma.$transaction(async (tx: any) => {
    await assertAvailable(tx, quote.package.unitId, checkInDate, checkOutDate);
    let guest = await tx.guest.findFirst({ where: { email: input.guest.email.toLowerCase() } });
    if (guest) {
      guest = await tx.guest.update({ where: { id: guest.id }, data: { firstName: input.guest.firstName, lastName: input.guest.lastName, phone: input.guest.phone, country: input.guest.country, address: input.guest.address } });
    } else {
      guest = await tx.guest.create({ data: { ...input.guest, email: input.guest.email.toLowerCase() } });
    }
    const created = await tx.booking.create({
      data: {
        reference: createBookingReference("RMV", checkInDate),
        propertyId: quote.package.propertyId,
        unitId: quote.package.unitId,
        packageId: quote.package.id,
        guestId: guest.id,
        checkInDate,
        checkOutDate,
        nights: quote.nights,
        adults: input.adults,
        children: input.children,
        infants: input.infants,
        subtotal: quote.subtotal,
        addOnTotal: quote.addOnTotal,
        discountTotal: quote.discountTotal,
        taxTotal: quote.taxTotal,
        serviceChargeTotal: quote.serviceChargeTotal,
        grandTotal: quote.grandTotal,
        depositRequired: quote.depositRequired,
        balanceDue: quote.grandTotal,
        currency: quote.currency,
        bookingStatus: "PENDING_PAYMENT",
        paymentStatus: "UNPAID",
        paymentOption: input.paymentOption,
        source: (input.source ?? "ADMIN") as never,
        specialRequests: input.specialRequests,
        internalNotes: input.internalNotes,
        confirmedAt: null,
        priceLines: { create: quote.lines.map((line) => ({ type: line.type as never, description: line.description, serviceDate: line.serviceDate ? new Date(`${line.serviceDate}T00:00:00.000Z`) : undefined, quantity: line.quantity, unitAmount: line.unitAmount, totalAmount: line.totalAmount, metadata: line.metadata as never })) },
      },
      include: bookingInclude,
    });
    return created;
  }, { isolationLevel: "Serializable" as never, maxWait: 5000, timeout: 10000 });

  await writeAudit(prisma, actor, "BOOKING_CREATED_MANUAL", "Booking", booking.reference, undefined, { reference: booking.reference, guest: input.guest.email, grandTotal: quote.grandTotal }, meta);
  return booking;
}

const editableFields = ["specialRequests", "internalNotes"] as const;

export async function updateBooking(prisma: PrismaClient, actor: AdminActor, id: string, patch: Partial<Pick<BookingEditable, typeof editableFields[number]>>, meta?: AuditMeta) {
  const existing = await prisma.booking.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "BOOKING_NOT_FOUND", "Booking not found.");
  if (["CANCELLED", "EXPIRED", "COMPLETED"].includes(existing.bookingStatus)) throw new ApiError(409, "BOOKING_LOCKED", "This booking cannot be edited in its current state.");

  const data: Prisma.BookingUpdateInput = {};
  for (const key of editableFields) if (patch[key] !== undefined) data[key] = patch[key] as never;

  const updated = await prisma.booking.update({ where: { id }, data, include: bookingInclude });
  await writeAudit(prisma, actor, "BOOKING_UPDATED", "Booking", updated.reference, { specialRequests: existing.specialRequests, internalNotes: existing.internalNotes }, { specialRequests: updated.specialRequests, internalNotes: updated.internalNotes }, meta);
  return updated;
}

type BookingEditable = { specialRequests?: string | null; internalNotes?: string | null };

export async function confirmBooking(prisma: PrismaClient, actor: AdminActor, id: string, meta?: AuditMeta) {
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) throw new ApiError(404, "BOOKING_NOT_FOUND", "Booking not found.");
  if (["CONFIRMED", "COMPLETED"].includes(booking.bookingStatus)) throw new ApiError(409, "INVALID_TRANSITION", "Booking is already confirmed.");
  if (["CANCELLED", "EXPIRED"].includes(booking.bookingStatus)) throw new ApiError(409, "INVALID_TRANSITION", "Cancelled bookings cannot be confirmed.");

  const updated = await prisma.booking.update({ where: { id }, data: { bookingStatus: "CONFIRMED", confirmedAt: new Date() }, include: bookingInclude });
  await writeAudit(prisma, actor, "BOOKING_CONFIRMED", "Booking", updated.reference, { bookingStatus: booking.bookingStatus }, { bookingStatus: "CONFIRMED" }, meta);
  return updated;
}

export async function cancelBooking(prisma: PrismaClient, actor: AdminActor, id: string, reason?: string, meta?: AuditMeta) {
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) throw new ApiError(404, "BOOKING_NOT_FOUND", "Booking not found.");
  if (["CANCELLED", "COMPLETED"].includes(booking.bookingStatus)) throw new ApiError(409, "INVALID_TRANSITION", `Booking is already ${booking.bookingStatus}.`);

  const updated = await prisma.booking.update({ where: { id }, data: { bookingStatus: "CANCELLED", cancelledAt: new Date(), cancellationReason: reason ?? null }, include: bookingInclude });
  await writeAudit(prisma, actor, "BOOKING_CANCELLED", "Booking", updated.reference, { bookingStatus: booking.bookingStatus }, { bookingStatus: "CANCELLED", reason }, meta);
  return updated;
}

export async function checkInBooking(prisma: PrismaClient, actor: AdminActor, id: string, meta?: AuditMeta) {
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) throw new ApiError(404, "BOOKING_NOT_FOUND", "Booking not found.");
  if (booking.actualCheckInAt) throw new ApiError(409, "ALREADY_CHECKED_IN", "Guest is already checked in.");
  if (!["CONFIRMED", "PENDING_PAYMENT", "PAYMENT_PROCESSING"].includes(booking.bookingStatus)) throw new ApiError(409, "INVALID_TRANSITION", `Cannot check in a ${booking.bookingStatus} booking.`);

  const updated = await prisma.booking.update({ where: { id }, data: { actualCheckInAt: new Date(), bookingStatus: "CONFIRMED" }, include: bookingInclude });
  await writeAudit(prisma, actor, "GUEST_CHECKED_IN", "Booking", updated.reference, { actualCheckInAt: booking.actualCheckInAt }, { actualCheckInAt: updated.actualCheckInAt }, meta);
  return updated;
}

export async function checkOutBooking(prisma: PrismaClient, actor: AdminActor, id: string, meta?: AuditMeta) {
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) throw new ApiError(404, "BOOKING_NOT_FOUND", "Booking not found.");
  if (booking.actualCheckOutAt) throw new ApiError(409, "ALREADY_CHECKED_OUT", "Guest is already checked out.");
  if (!booking.actualCheckInAt) throw new ApiError(409, "NOT_CHECKED_IN", "Guest has not checked in yet.");

  const updated = await prisma.booking.update({ where: { id }, data: { actualCheckOutAt: new Date(), bookingStatus: "COMPLETED" }, include: bookingInclude });
  await writeAudit(prisma, actor, "GUEST_CHECKED_OUT", "Booking", updated.reference, { actualCheckOutAt: booking.actualCheckOutAt }, { actualCheckOutAt: updated.actualCheckOutAt }, meta);
  return updated;
}

export async function markNoShow(prisma: PrismaClient, actor: AdminActor, id: string, meta?: AuditMeta) {
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) throw new ApiError(404, "BOOKING_NOT_FOUND", "Booking not found.");
  if (["CANCELLED", "COMPLETED", "NO_SHOW"].includes(booking.bookingStatus)) throw new ApiError(409, "INVALID_TRANSITION", `Cannot mark a ${booking.bookingStatus} booking as no-show.`);

  const updated = await prisma.booking.update({ where: { id }, data: { bookingStatus: "NO_SHOW", noShowMarkedAt: new Date() }, include: bookingInclude });
  await writeAudit(prisma, actor, "BOOKING_NO_SHOW", "Booking", updated.reference, { bookingStatus: booking.bookingStatus }, { bookingStatus: "NO_SHOW" }, meta);
  return updated;
}

export async function extendStay(prisma: PrismaClient, actor: AdminActor, id: string, newCheckOutDate: string, meta?: AuditMeta) {
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      package: {
        include: {
          property: true,
          seasonalRates: { where: { active: true }, orderBy: [{ priority: "desc" }] },
          dateOverrides: true,
        },
      },
      priceLines: true,
    },
  });
  if (!booking) throw new ApiError(404, "BOOKING_NOT_FOUND", "Booking not found.");
  if (!booking.actualCheckInAt) throw new ApiError(409, "NOT_CHECKED_IN", "Guest must be checked in before extending.");
  const newCheckOut = new Date(`${newCheckOutDate}T00:00:00.000Z`);
  if (newCheckOut <= booking.checkOutDate) throw new ApiError(400, "INVALID_DATES", "New check-out must be after the current check-out.");

  const additionalNights = nightsBetween(booking.checkOutDate, newCheckOut);
  if (additionalNights <= 0) throw new ApiError(400, "INVALID_DATES", "Extension must add at least one night.");

  const pkg = booking.package;
  const newPriceLines: Prisma.BookingPriceLineCreateWithoutBookingInput[] = [];
  let additionalAccommodation = new Decimal(0);

  for (const night of occupiedNights(booking.checkOutDate, newCheckOut)) {
    const key = dateKey(night);
    const override = pkg.dateOverrides.find((o) => dateKey(o.date) === key);
    if (override?.closed) throw new ApiError(409, "DATES_CLOSED", `The villa is closed on ${key}.`);
    const seasonal = pkg.seasonalRates.find((rate) => rate.startDate <= night && rate.endDate >= night);
    const isWeekend = [5, 6].includes(night.getUTCDay());
    const nightlyPrice = new Decimal(override?.price?.toString() ?? (isWeekend && seasonal?.weekendPrice ? seasonal.weekendPrice.toString() : seasonal?.nightlyPrice?.toString() ?? pkg.basePrice.toString()));
    additionalAccommodation = additionalAccommodation.plus(nightlyPrice);
    newPriceLines.push({
      type: "ROOM_RATE",
      description: seasonal ? `${seasonal.name} villa rate (stay extension)` : "Nightly villa rate (stay extension)",
      serviceDate: new Date(`${key}T00:00:00.000Z`),
      quantity: 1,
      unitAmount: nightlyPrice.toNumber(),
      totalAmount: nightlyPrice.toNumber(),
      metadata: { overrideId: override?.id, seasonalRateId: seasonal?.id, isExtension: true },
    });
  }

  // Calculate tax & service charge on the additional accommodation
  const serviceCharge = additionalAccommodation.mul(pkg.property.serviceChargePercentage.toString()).div(100);
  const tax = additionalAccommodation.plus(serviceCharge).mul(pkg.property.taxPercentage.toString()).div(100);
  const additionalGrandTotal = additionalAccommodation.plus(serviceCharge).plus(tax);

  if (!serviceCharge.isZero()) {
    newPriceLines.push({
      type: "SERVICE_CHARGE",
      description: "Service charge (extension)",
      quantity: 1,
      unitAmount: serviceCharge.toNumber(),
      totalAmount: serviceCharge.toNumber(),
    });
  }
  if (!tax.isZero()) {
    newPriceLines.push({
      type: "TAX",
      description: "Tax (extension)",
      quantity: 1,
      unitAmount: tax.toNumber(),
      totalAmount: tax.toNumber(),
    });
  }

  const updatedBooking = await prisma.$transaction(async (tx) => {
    // 1. Verify availability for the extended dates
    await assertAvailable(tx as PrismaClient, booking.unitId, booking.checkOutDate, newCheckOut);

    // 2. Add price lines
    for (const pl of newPriceLines) {
      await tx.bookingPriceLine.create({
        data: {
          ...pl,
          bookingId: booking.id,
        },
      });
    }

    // 3. Update booking financial totals and dates
    const newSubtotal = new Decimal(booking.subtotal.toString()).plus(additionalAccommodation);
    const newServiceChargeTotal = new Decimal(booking.serviceChargeTotal.toString()).plus(serviceCharge);
    const newTaxTotal = new Decimal(booking.taxTotal.toString()).plus(tax);
    const newGrandTotal = new Decimal(booking.grandTotal.toString()).plus(additionalGrandTotal);
    const newBalanceDue = new Decimal(booking.balanceDue.toString()).plus(additionalGrandTotal);

    return tx.booking.update({
      where: { id },
      data: {
        checkOutDate: newCheckOut,
        nights: booking.nights + additionalNights,
        subtotal: newSubtotal.toFixed(2),
        serviceChargeTotal: newServiceChargeTotal.toFixed(2),
        taxTotal: newTaxTotal.toFixed(2),
        grandTotal: newGrandTotal.toFixed(2),
        balanceDue: newBalanceDue.toFixed(2),
        paymentStatus: newBalanceDue.gt(0) ? (new Decimal(booking.amountPaid.toString()).gt(0) ? "PARTIALLY_PAID" : "UNPAID") : booking.paymentStatus,
      },
      include: bookingInclude,
    });
  }, { isolationLevel: "Serializable" as never, maxWait: 5000, timeout: 10000 });

  await writeAudit(prisma, actor, "BOOKING_EXTENDED", "Booking", updatedBooking.reference, { checkOutDate: booking.checkOutDate, nights: booking.nights, grandTotal: booking.grandTotal }, { checkOutDate: updatedBooking.checkOutDate, nights: updatedBooking.nights, grandTotal: updatedBooking.grandTotal }, meta);
  return updatedBooking;
}

export async function changeRoom(prisma: PrismaClient, actor: AdminActor, id: string, unitId: string, meta?: AuditMeta) {
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) throw new ApiError(404, "BOOKING_NOT_FOUND", "Booking not found.");
  const unit = await prisma.unit.findUnique({ where: { id: unitId } });
  if (!unit || !unit.active) throw new ApiError(404, "UNIT_NOT_FOUND", "Unit not found.");
  const totalGuests = booking.adults + booking.children;
  if (totalGuests > unit.maximumOccupancy) {
    throw new ApiError(400, "OCCUPANCY_EXCEEDED", `The unit maximum capacity of ${unit.maximumOccupancy} is less than the booking's ${totalGuests} guests.`);
  }
  await assertAvailable(prisma, unitId, booking.checkInDate, booking.checkOutDate);

  const updated = await prisma.booking.update({ where: { id }, data: { unitId }, include: bookingInclude });
  await writeAudit(prisma, actor, "BOOKING_ROOM_CHANGED", "Booking", updated.reference, { unitId: booking.unitId }, { unitId }, meta);
  return updated;
}

export function staysUntil(checkIn: Date, nights: number) {
  return addDays(checkIn, nights);
}

export { quoteSchema };
