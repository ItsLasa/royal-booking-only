"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.quoteSchema = void 0;
exports.calculateQuote = calculateQuote;
const zod_1 = require("zod");
const decimal_js_1 = __importDefault(require("decimal.js"));
const dates_1 = require("../lib/dates");
const money_1 = require("../lib/money");
const apiResponse_1 = require("../lib/apiResponse");
exports.quoteSchema = zod_1.z.object({
    packageId: zod_1.z.string().min(1),
    checkInDate: zod_1.z.string().date(),
    checkOutDate: zod_1.z.string().date(),
    adults: zod_1.z.number().int().min(1),
    children: zod_1.z.number().int().min(0).default(0),
    infants: zod_1.z.number().int().min(0).default(0),
    addOns: zod_1.z.array(zod_1.z.object({ addOnId: zod_1.z.string(), quantity: zod_1.z.number().int().min(1) })).default([]),
    couponCode: zod_1.z.string().trim().optional(),
    paymentOption: zod_1.z.enum(["DEPOSIT", "FULL"]).default("DEPOSIT"),
});
async function calculateQuote(prisma, input) {
    const checkIn = new Date(`${input.checkInDate}T00:00:00.000Z`);
    const checkOut = new Date(`${input.checkOutDate}T00:00:00.000Z`);
    const nights = (0, dates_1.nightsBetween)(checkIn, checkOut);
    if (nights <= 0)
        throw new apiResponse_1.ApiError(400, "INVALID_DATES", "Check-out must be after check-in.");
    const pkg = await prisma.package.findFirst({
        where: { id: input.packageId, active: true },
        include: { property: true, unit: true, seasonalRates: { where: { active: true }, orderBy: [{ priority: "desc" }] }, dateOverrides: true },
    });
    if (!pkg)
        throw new apiResponse_1.ApiError(404, "PACKAGE_NOT_FOUND", "Package is not available.");
    if (nights < pkg.minimumNights || nights > pkg.maximumNights)
        throw new apiResponse_1.ApiError(400, "STAY_RULE_FAILED", `Stay must be between ${pkg.minimumNights} and ${pkg.maximumNights} nights.`);
    const totalGuests = input.adults + input.children;
    if (totalGuests > pkg.maximumGuests || totalGuests > pkg.unit.maximumOccupancy)
        throw new apiResponse_1.ApiError(400, "OCCUPANCY_EXCEEDED", "The selected guest count exceeds this villa package capacity.");
    const lines = [];
    let accommodation = (0, money_1.money)(0);
    let minimumNights = pkg.minimumNights;
    for (const night of (0, dates_1.occupiedNights)(checkIn, checkOut)) {
        const key = (0, dates_1.dateKey)(night);
        const override = pkg.dateOverrides.find((o) => (0, dates_1.dateKey)(o.date) === key);
        if (override?.closed)
            throw new apiResponse_1.ApiError(409, "DATES_CLOSED", `The villa is closed on ${key}.`);
        if (override?.minimumNights)
            minimumNights = Math.max(minimumNights, override.minimumNights);
        const seasonal = pkg.seasonalRates.find((rate) => rate.startDate <= night && rate.endDate >= night);
        const isWeekend = [5, 6].includes(night.getUTCDay());
        const nightly = (0, money_1.money)(override?.price ?? (isWeekend && seasonal?.weekendPrice ? seasonal.weekendPrice : seasonal?.nightlyPrice ?? pkg.basePrice));
        accommodation = accommodation.plus(nightly);
        lines.push({ type: "ROOM_RATE", description: seasonal ? `${seasonal.name} villa rate` : "Nightly villa rate", serviceDate: key, quantity: 1, unitAmount: (0, money_1.toNumber)(nightly), totalAmount: (0, money_1.toNumber)(nightly), metadata: { overrideId: override?.id, seasonalRateId: seasonal?.id } });
    }
    if (nights < minimumNights)
        throw new apiResponse_1.ApiError(400, "MINIMUM_STAY", `The selected dates require at least ${minimumNights} nights.`);
    const extraAdults = Math.max(0, input.adults - pkg.includedAdults);
    const extraChildren = Math.max(0, input.children - pkg.includedChildren);
    let extraGuestTotal = (0, money_1.money)(extraAdults * 5000 * nights + extraChildren * 2500 * nights);
    if (!extraGuestTotal.isZero())
        lines.push({ type: "EXTRA_GUEST", description: "Extra guest charges", quantity: nights, unitAmount: (0, money_1.toNumber)(extraGuestTotal.div(nights)), totalAmount: (0, money_1.toNumber)(extraGuestTotal) });
    const addOnIds = input.addOns.map((a) => a.addOnId);
    const addOns = addOnIds.length ? await prisma.addOn.findMany({ where: { id: { in: addOnIds }, propertyId: pkg.propertyId, active: true } }) : [];
    let addOnTotal = (0, money_1.money)(0);
    for (const selected of input.addOns) {
        const addOn = addOns.find((a) => a.id === selected.addOnId);
        if (!addOn)
            throw new apiResponse_1.ApiError(400, "INVALID_ADD_ON", "One selected add-on is unavailable.");
        if (selected.quantity > addOn.maximumQuantity)
            throw new apiResponse_1.ApiError(400, "INVALID_ADD_ON_QUANTITY", `${addOn.name} allows a maximum quantity of ${addOn.maximumQuantity}.`);
        const multiplier = addOn.pricingType === "PER_BOOKING" ? 1 : addOn.pricingType === "PER_NIGHT" ? nights : addOn.pricingType === "PER_GUEST" ? totalGuests : totalGuests * nights;
        const total = (0, money_1.money)(new decimal_js_1.default(addOn.price.toString()).mul(selected.quantity).mul(multiplier));
        addOnTotal = addOnTotal.plus(total);
        lines.push({ type: "ADD_ON", description: addOn.name, quantity: selected.quantity, unitAmount: (0, money_1.toNumber)(addOn.price), totalAmount: (0, money_1.toNumber)(total), metadata: { addOnId: addOn.id, pricingType: addOn.pricingType } });
    }
    const subtotal = accommodation.plus(extraGuestTotal);
    let discountTotal = (0, money_1.money)(0);
    let coupon = null;
    if (input.couponCode) {
        coupon = await prisma.coupon.findUnique({ where: { code: input.couponCode.trim().toUpperCase() } });
        const today = new Date();
        const valid = coupon?.active && (!coupon.validFrom || coupon.validFrom <= today) && (!coupon.validUntil || coupon.validUntil >= today) && (!coupon.usageLimit || coupon.usageCount < coupon.usageLimit) && (!coupon.minimumBookingAmount || subtotal.greaterThanOrEqualTo(coupon.minimumBookingAmount.toString()));
        if (!valid || !coupon)
            throw new apiResponse_1.ApiError(400, "INVALID_COUPON", "The coupon is not valid for this booking.");
        discountTotal = coupon.discountType === "PERCENTAGE" ? subtotal.mul(coupon.discountValue.toString()).div(100) : (0, money_1.money)(coupon.discountValue.toString());
        if (coupon.maximumDiscount)
            discountTotal = decimal_js_1.default.min(discountTotal, new decimal_js_1.default(coupon.maximumDiscount.toString()));
        discountTotal = (0, money_1.money)(discountTotal);
        lines.push({ type: "DISCOUNT", description: `Coupon ${coupon.code}`, quantity: 1, unitAmount: -(0, money_1.toNumber)(discountTotal), totalAmount: -(0, money_1.toNumber)(discountTotal), metadata: { couponId: coupon.id } });
    }
    const taxable = subtotal.plus(addOnTotal).minus(discountTotal);
    const serviceChargeTotal = (0, money_1.money)(taxable.mul(pkg.property.serviceChargePercentage.toString()).div(100));
    const taxTotal = (0, money_1.money)(taxable.plus(serviceChargeTotal).mul(pkg.property.taxPercentage.toString()).div(100));
    if (!serviceChargeTotal.isZero())
        lines.push({ type: "SERVICE_CHARGE", description: "Service charge", quantity: 1, unitAmount: (0, money_1.toNumber)(serviceChargeTotal), totalAmount: (0, money_1.toNumber)(serviceChargeTotal) });
    if (!taxTotal.isZero())
        lines.push({ type: "TAX", description: "Tax", quantity: 1, unitAmount: (0, money_1.toNumber)(taxTotal), totalAmount: (0, money_1.toNumber)(taxTotal) });
    const grandTotal = (0, money_1.money)(taxable.plus(serviceChargeTotal).plus(taxTotal));
    const depositRequired = input.paymentOption === "FULL" ? grandTotal : (0, money_1.money)(grandTotal.mul(pkg.depositPercentage.toString()).div(100));
    return { package: pkg, nights, lines, subtotal: (0, money_1.toNumber)(subtotal), addOnTotal: (0, money_1.toNumber)(addOnTotal), discountTotal: (0, money_1.toNumber)(discountTotal), serviceChargeTotal: (0, money_1.toNumber)(serviceChargeTotal), taxTotal: (0, money_1.toNumber)(taxTotal), grandTotal: (0, money_1.toNumber)(grandTotal), depositRequired: (0, money_1.toNumber)(depositRequired), amountDueNow: (0, money_1.toNumber)(depositRequired), balanceDue: (0, money_1.toNumber)(grandTotal.minus(depositRequired)), currency: pkg.property.currency, couponId: coupon?.id };
}
