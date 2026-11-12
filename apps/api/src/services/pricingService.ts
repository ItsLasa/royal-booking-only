import { z } from "zod";
import Decimal from "decimal.js";
import { PrismaClient } from "@prisma/client";
import { dateKey, nightsBetween, occupiedNights } from "../lib/dates";
import { money, toNumber } from "../lib/money";
import { ApiError } from "../lib/apiResponse";

export const quoteSchema = z.object({
  packageId: z.string().min(1),
  checkInDate: z.string().date(),
  checkOutDate: z.string().date(),
  adults: z.number().int().min(1),
  children: z.number().int().min(0).default(0),
  infants: z.number().int().min(0).default(0),
  addOns: z.array(z.object({ addOnId: z.string(), quantity: z.number().int().min(1) })).default([]),
  couponCode: z.string().trim().optional(),
  paymentOption: z.enum(["DEPOSIT", "FULL"]).default("DEPOSIT"),
});

export type QuoteInput = z.infer<typeof quoteSchema>;
export type QuoteLine = { type: string; description: string; serviceDate?: string; quantity: number; unitAmount: number; totalAmount: number; metadata?: Record<string, unknown> };

export async function calculateQuote(prisma: PrismaClient, input: QuoteInput) {
  const checkIn = new Date(`${input.checkInDate}T00:00:00.000Z`);
  const checkOut = new Date(`${input.checkOutDate}T00:00:00.000Z`);
  const nights = nightsBetween(checkIn, checkOut);
  if (nights <= 0) throw new ApiError(400, "INVALID_DATES", "Check-out must be after check-in.");

  const pkg = await prisma.package.findFirst({
    where: { id: input.packageId, active: true },
    include: { property: true, unit: true, seasonalRates: { where: { active: true }, orderBy: [{ priority: "desc" }] }, dateOverrides: true },
  });
  if (!pkg) throw new ApiError(404, "PACKAGE_NOT_FOUND", "Package is not available.");
  if (nights < pkg.minimumNights || nights > pkg.maximumNights) throw new ApiError(400, "STAY_RULE_FAILED", `Stay must be between ${pkg.minimumNights} and ${pkg.maximumNights} nights.`);
  const totalGuests = input.adults + input.children;
  if (totalGuests > pkg.maximumGuests || totalGuests > pkg.unit.maximumOccupancy) throw new ApiError(400, "OCCUPANCY_EXCEEDED", "The selected guest count exceeds this villa package capacity.");

  const lines: QuoteLine[] = [];
  let accommodation = money(0);
  let minimumNights = pkg.minimumNights;
  for (const night of occupiedNights(checkIn, checkOut)) {
    const key = dateKey(night);
    const override = pkg.dateOverrides.find((o: any) => dateKey(o.date) === key);
    if (override?.closed) throw new ApiError(409, "DATES_CLOSED", `The villa is closed on ${key}.`);
    if (override?.minimumNights) minimumNights = Math.max(minimumNights, override.minimumNights);
    const seasonal = pkg.seasonalRates.find((rate: any) => rate.startDate <= night && rate.endDate >= night);
    const isWeekend = [5, 6].includes(night.getUTCDay());
    const nightly = money(override?.price ?? (isWeekend && seasonal?.weekendPrice ? seasonal.weekendPrice : seasonal?.nightlyPrice ?? pkg.basePrice));
    accommodation = accommodation.plus(nightly);
    lines.push({ type: "ROOM_RATE", description: seasonal ? `${seasonal.name} villa rate` : "Nightly villa rate", serviceDate: key, quantity: 1, unitAmount: toNumber(nightly), totalAmount: toNumber(nightly), metadata: { overrideId: override?.id, seasonalRateId: seasonal?.id } });
  }
  if (nights < minimumNights) throw new ApiError(400, "MINIMUM_STAY", `The selected dates require at least ${minimumNights} nights.`);

  const extraAdults = Math.max(0, input.adults - pkg.includedAdults);
  const extraChildren = Math.max(0, input.children - pkg.includedChildren);
  let extraGuestTotal = money(extraAdults * 5000 * nights + extraChildren * 2500 * nights);
  if (!extraGuestTotal.isZero()) lines.push({ type: "EXTRA_GUEST", description: "Extra guest charges", quantity: nights, unitAmount: toNumber(extraGuestTotal.div(nights)), totalAmount: toNumber(extraGuestTotal) });

  const addOnIds = input.addOns.map((a) => a.addOnId);
  const addOns = addOnIds.length ? await prisma.addOn.findMany({ where: { id: { in: addOnIds }, propertyId: pkg.propertyId, active: true } }) : [];
  let addOnTotal = money(0);
  for (const selected of input.addOns) {
    const addOn = addOns.find((a: any) => a.id === selected.addOnId);
    if (!addOn) throw new ApiError(400, "INVALID_ADD_ON", "One selected add-on is unavailable.");
    if (selected.quantity > addOn.maximumQuantity) throw new ApiError(400, "INVALID_ADD_ON_QUANTITY", `${addOn.name} allows a maximum quantity of ${addOn.maximumQuantity}.`);
    const multiplier = addOn.pricingType === "PER_BOOKING" ? 1 : addOn.pricingType === "PER_NIGHT" ? nights : addOn.pricingType === "PER_GUEST" ? totalGuests : totalGuests * nights;
    const total = money(new Decimal(addOn.price.toString()).mul(selected.quantity).mul(multiplier));
    addOnTotal = addOnTotal.plus(total);
    lines.push({ type: "ADD_ON", description: addOn.name, quantity: selected.quantity, unitAmount: toNumber(addOn.price), totalAmount: toNumber(total), metadata: { addOnId: addOn.id, pricingType: addOn.pricingType } });
  }

  const subtotal = accommodation.plus(extraGuestTotal);
  let discountTotal = money(0);
  let coupon = null;
  if (input.couponCode) {
    coupon = await prisma.coupon.findUnique({ where: { code: input.couponCode.trim().toUpperCase() } });
    const today = new Date();
    const valid = coupon?.active && (!coupon.validFrom || coupon.validFrom <= today) && (!coupon.validUntil || coupon.validUntil >= today) && (!coupon.usageLimit || coupon.usageCount < coupon.usageLimit) && (!coupon.minimumBookingAmount || subtotal.greaterThanOrEqualTo(coupon.minimumBookingAmount.toString()));
    if (!valid || !coupon) throw new ApiError(400, "INVALID_COUPON", "The coupon is not valid for this booking.");
    discountTotal = coupon.discountType === "PERCENTAGE" ? subtotal.mul(coupon.discountValue.toString()).div(100) : money(coupon.discountValue.toString());
    if (coupon.maximumDiscount) discountTotal = Decimal.min(discountTotal, new Decimal(coupon.maximumDiscount.toString())) as Decimal;
    discountTotal = Decimal.min(discountTotal, subtotal) as Decimal;
    discountTotal = money(discountTotal);
    lines.push({ type: "DISCOUNT", description: `Coupon ${coupon.code}`, quantity: 1, unitAmount: -toNumber(discountTotal), totalAmount: -toNumber(discountTotal), metadata: { couponId: coupon.id } });
  }

  const rawTaxable = subtotal.plus(addOnTotal).minus(discountTotal);
  const taxable = money(Decimal.max(0, rawTaxable));
  const serviceChargeTotal = money(taxable.mul(pkg.property.serviceChargePercentage.toString()).div(100));
  const taxTotal = money(taxable.plus(serviceChargeTotal).mul(pkg.property.taxPercentage.toString()).div(100));
  if (!serviceChargeTotal.isZero()) lines.push({ type: "SERVICE_CHARGE", description: "Service charge", quantity: 1, unitAmount: toNumber(serviceChargeTotal), totalAmount: toNumber(serviceChargeTotal) });
  if (!taxTotal.isZero()) lines.push({ type: "TAX", description: "Tax", quantity: 1, unitAmount: toNumber(taxTotal), totalAmount: toNumber(taxTotal) });
  const grandTotal = money(Decimal.max(0, taxable.plus(serviceChargeTotal).plus(taxTotal)));
  const depositRequired = input.paymentOption === "FULL" ? grandTotal : money(Decimal.max(0, grandTotal.mul(pkg.depositPercentage.toString()).div(100)));

  return { package: pkg, nights, lines, subtotal: toNumber(subtotal), addOnTotal: toNumber(addOnTotal), discountTotal: toNumber(discountTotal), serviceChargeTotal: toNumber(serviceChargeTotal), taxTotal: toNumber(taxTotal), grandTotal: toNumber(grandTotal), depositRequired: toNumber(depositRequired), amountDueNow: toNumber(depositRequired), balanceDue: toNumber(grandTotal.minus(depositRequired)), currency: pkg.property.currency, couponId: coupon?.id };
}

