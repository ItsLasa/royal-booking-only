"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBookingHold = createBookingHold;
exports.publicBooking = publicBooking;
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const date_fns_1 = require("date-fns");
const env_1 = require("../config/env");
const apiResponse_1 = require("../lib/apiResponse");
const references_1 = require("../lib/references");
const availabilityService_1 = require("./availabilityService");
const pricingService_1 = require("./pricingService");
async function createBookingHold(prisma, input) {
    if (!input.termsAccepted)
        throw new apiResponse_1.ApiError(400, "TERMS_REQUIRED", "Please accept the booking terms before continuing.");
    const quote = await (0, pricingService_1.calculateQuote)(prisma, input);
    const checkInDate = new Date(`${input.checkInDate}T00:00:00.000Z`);
    const checkOutDate = new Date(`${input.checkOutDate}T00:00:00.000Z`);
    // Asynchronously compute hash before entering database transaction to prevent event-loop blocking
    const manageTokenHash = await bcryptjs_1.default.hash(`${input.guest.email}:${Date.now()}`, 10);
    for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
            return await prisma.$transaction(async (tx) => {
                await (0, availabilityService_1.assertAvailable)(tx, quote.package.unitId, checkInDate, checkOutDate);
                const guest = await tx.guest.create({ data: input.guest });
                const booking = await tx.booking.create({
                    data: {
                        reference: (0, references_1.createBookingReference)("RMV", checkInDate),
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
                        expiresAt: (0, date_fns_1.addMinutes)(new Date(), env_1.env.BOOKING_HOLD_MINUTES),
                        manageTokenHash,
                        priceLines: {
                            create: quote.lines.map((line) => ({
                                type: line.type,
                                description: line.description,
                                serviceDate: line.serviceDate ? new Date(`${line.serviceDate}T00:00:00.000Z`) : undefined,
                                quantity: line.quantity,
                                unitAmount: line.unitAmount,
                                totalAmount: line.totalAmount,
                                metadata: line.metadata,
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
            }, { isolationLevel: "Serializable", maxWait: 5000, timeout: 10000 });
        }
        catch (error) {
            // Only retry on transient database serialization / deadlock conflicts (P2034)
            const isDeadlock = error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === "P2034";
            if (!isDeadlock || attempt === 2) {
                throw error;
            }
        }
    }
    throw new apiResponse_1.ApiError(409, "DATES_UNAVAILABLE", "The selected dates are no longer available.");
}
function maskEmail(email) {
    if (!email)
        return "";
    const parts = email.split("@");
    if (parts.length !== 2)
        return "***";
    const name = parts[0];
    const domain = parts[1];
    const maskedName = name.length <= 2 ? name[0] + "***" : name[0] + "***" + name[name.length - 1];
    return `${maskedName}@${domain}`;
}
function maskPhone(phone) {
    if (!phone)
        return "";
    if (phone.length <= 4)
        return "****";
    return phone.slice(0, 3) + "***" + phone.slice(-2);
}
function publicBooking(booking, options = {}) {
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
            ? booking.priceLines.map((l) => ({
                description: l.description,
                totalAmount: Number(l.totalAmount),
                unitAmount: Number(l.unitAmount),
                quantity: l.quantity,
                type: l.type,
            }))
            : [],
        addOns: booking.addOns
            ? booking.addOns.map((a) => ({
                name: a.nameSnapshot,
                quantity: a.quantity,
                total: Number(a.total),
            }))
            : [],
    };
}
