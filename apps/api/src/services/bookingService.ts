import { Prisma, PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { addMinutes } from "date-fns";
import { env } from "../config/env";
import { ApiError } from "../lib/apiResponse";
import { createBookingReference } from "../lib/references";
import { assertAvailable } from "./availabilityService";
import { QuoteInput, calculateQuote } from "./pricingService";

export type HoldInput = QuoteInput & {
  guest: { firstName: string; lastName: string; email: string; phone: string; country?: string; address?: string; marketingConsent?: boolean };
  specialRequests?: string;
  termsAccepted: boolean;
};

export async function createBookingHold(prisma: PrismaClient, input: HoldInput) {
  if (!input.termsAccepted) throw new ApiError(400, "TERMS_REQUIRED", "Please accept the booking terms before continuing.");
  const quote = await calculateQuote(prisma, input);
  const checkInDate = new Date(`${input.checkInDate}T00:00:00.000Z`);
  const checkOutDate = new Date(`${input.checkOutDate}T00:00:00.000Z`);

  // Asynchronously compute hash before entering database transaction to prevent event-loop blocking
  const manageTokenHash = await bcrypt.hash(`${input.guest.email}:${Date.now()}`, 10);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(async (tx: any) => {
        await assertAvailable(tx as PrismaClient, quote.package.unitId, checkInDate, checkOutDate);
        const guest = await tx.guest.create({ data: input.guest });
        const booking = await tx.booking.create({
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
            paymentOption: input.paymentOption,
            bookingStatus: input.paymentOption === "FULL" || input.paymentOption === "DEPOSIT" ? "HOLD" : "PENDING_PAYMENT",
            paymentStatus: "UNPAID",
            source: "DIRECT_WEBSITE",
            specialRequests: input.specialRequests,
            expiresAt: addMinutes(new Date(), env.BOOKING_HOLD_MINUTES),
            manageTokenHash,
            priceLines: {
              create: quote.lines.map((line) => ({
                type: line.type as any,
                description: line.description,
                serviceDate: line.serviceDate ? new Date(`${line.serviceDate}T00:00:00.000Z`) : undefined,
                quantity: line.quantity,
                unitAmount: line.unitAmount,
                totalAmount: line.totalAmount,
                metadata: line.metadata as any,
              })),
            },
            payments: {
              create: {
                provider: "PAYHERE",
                idempotencyKey: `${quote.package.id}-${Date.now()}-${attempt}`,
                amount: quote.depositRequired,
                currency: quote.currency,
                status: "UNPAID",
                providerOrderId: undefined,
              },
            },
          },
          include: { guest: true, package: true, priceLines: true, payments: true },
        });
        return { booking, quote, expiresAt: booking.expiresAt };
      }, { isolationLevel: "Serializable" as any, maxWait: 5000, timeout: 10000 });
    } catch (error: any) {
      // Only retry on transient database serialization / deadlock conflicts (P2034)
      const isDeadlock = error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
      if (!isDeadlock || attempt === 2) {
        throw error;
      }
    }
  }
  throw new ApiError(409, "DATES_UNAVAILABLE", "The selected dates are no longer available.");
}

function maskEmail(email?: string | null): string {
  if (!email) return "";
  const parts = email.split("@");
  if (parts.length !== 2) return "***";
  const name = parts[0];
  const domain = parts[1];
  const maskedName = name.length <= 2 ? name[0] + "***" : name[0] + "***" + name[name.length - 1];
  return `${maskedName}@${domain}`;
}

function maskPhone(phone?: string | null): string {
  if (!phone) return "";
  if (phone.length <= 4) return "****";
  return phone.slice(0, 3) + "***" + phone.slice(-2);
}

export function publicBooking(booking: any, options: { unmasked?: boolean } = {}) {
  const isUnmasked = options.unmasked === true;

  return {
    reference: booking.reference,
    status: booking.bookingStatus,
    paymentStatus: booking.paymentStatus,
    checkInDate: booking.checkInDate,
    checkOutDate: booking.checkOutDate,
    nights: booking.nights,
    guests: { adults: booking.adults, children: booking.children, infants: booking.infants },
    totals: {
      grandTotal: Number(booking.grandTotal),
      depositRequired: Number(booking.depositRequired),
      amountPaid: Number(booking.amountPaid),
      balanceDue: Number(booking.balanceDue),
      currency: booking.currency,
    },
    expiresAt: booking.expiresAt,
    guest: booking.guest
      ? {
          firstName: booking.guest.firstName,
          lastName: isUnmasked
            ? booking.guest.lastName
            : (booking.guest.lastName ? `${booking.guest.lastName.charAt(0)}***` : ""),
          email: isUnmasked ? booking.guest.email : maskEmail(booking.guest.email),
          phone: isUnmasked ? booking.guest.phone : maskPhone(booking.guest.phone),
          country: isUnmasked ? booking.guest.country : (booking.guest.country ? "***" : null),
        }
      : null,
    package: booking.package
      ? {
          id: booking.package.id,
          name: booking.package.name,
          shortDescription: booking.package.shortDescription,
        }
      : null,
    paymentOption: booking.paymentOption,
    specialRequests: isUnmasked ? booking.specialRequests : undefined,
    priceLines: booking.priceLines
      ? booking.priceLines.map((l: any) => ({
          description: l.description,
          totalAmount: Number(l.totalAmount),
          unitAmount: Number(l.unitAmount),
          quantity: l.quantity,
          type: l.type,
        }))
      : [],
    addOns: booking.addOns
      ? booking.addOns.map((a: any) => ({
          name: a.nameSnapshot,
          quantity: a.quantity,
          total: Number(a.total),
        }))
      : [],
  };
}

