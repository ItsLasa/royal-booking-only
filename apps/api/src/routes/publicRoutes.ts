import { Router } from "express";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import { prisma } from "../lib/prisma";
import { ApiError, ok } from "../lib/apiResponse";
import { assertAvailable } from "../services/availabilityService";
import { calculateQuote, quoteSchema } from "../services/pricingService";
import { createBookingHold, publicBooking } from "../services/bookingService";
import { validateBody } from "../middleware/validation";

export const publicRoutes = Router();

// Anti-DoS rate limiter on reservation holds to prevent inventory locking attacks
const holdLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 6, // max 6 hold attempts per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: "HOLD_LIMIT_EXCEEDED",
      message: "Too many reservation holds created. Please wait a few minutes before trying again.",
    },
  },
});

const cancellationSchema = z.object({
  reason: z.string().trim().min(1, "Cancellation reason is required").max(1000, "Reason cannot exceed 1000 characters"),
});

const bookingHoldBodySchema = quoteSchema.extend({
  guest: z.object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email("Valid email is required"),
    phone: z.string().min(7, "Valid phone number is required"),
    country: z.string().optional(),
    address: z.string().optional(),
    marketingConsent: z.boolean().optional(),
  }),
  specialRequests: z.string().max(1000).optional(),
  termsAccepted: z.literal(true),
});

publicRoutes.get("/public/packages", async (_req, res, next) => {
  try {
    const packages = await prisma.package.findMany({
      where: { active: true },
      orderBy: [{ featured: "desc" }, { displayOrder: "asc" }],
      include: {
        images: { orderBy: { displayOrder: "asc" } },
        unit: true,
        amenities: { include: { amenity: true } },
      },
    });
    res.json(ok(packages));
  } catch (e) {
    next(e);
  }
});

publicRoutes.get("/public/packages/:slug", async (req, res, next) => {
  try {
    const pkg = await prisma.package.findFirst({
      where: { slug: req.params.slug, active: true },
      include: {
        images: { orderBy: { displayOrder: "asc" } },
        unit: true,
        property: true,
        amenities: { include: { amenity: true } },
      },
    });
    res.json(ok(pkg));
  } catch (e) {
    next(e);
  }
});

publicRoutes.get("/public/add-ons", async (_req, res, next) => {
  try {
    const addOns = await prisma.addOn.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    });
    res.json(ok(addOns));
  } catch (e) {
    next(e);
  }
});

publicRoutes.post(
  "/availability/search",
  validateBody(
    z.object({
      packageId: z.string(),
      checkInDate: z.string().date(),
      checkOutDate: z.string().date(),
    })
  ),
  async (req, res, next) => {
    try {
      const pkg = await prisma.package.findUniqueOrThrow({
        where: { id: req.body.packageId },
      });
      const result = await assertAvailable(
        prisma,
        pkg.unitId,
        new Date(`${req.body.checkInDate}T00:00:00.000Z`),
        new Date(`${req.body.checkOutDate}T00:00:00.000Z`)
      );
      res.json(ok(result));
    } catch (e) {
      next(e);
    }
  }
);

publicRoutes.post("/quotes", validateBody(quoteSchema), async (req, res, next) => {
  try {
    res.json(ok(await calculateQuote(prisma, req.body)));
  } catch (e) {
    next(e);
  }
});

publicRoutes.post(
  "/bookings/hold",
  holdLimiter,
  validateBody(bookingHoldBodySchema),
  async (req, res, next) => {
    try {
      const hold = await createBookingHold(prisma, req.body);
      res.status(201).json(ok({ booking: publicBooking(hold.booking), quote: hold.quote }));
    } catch (e) {
      next(e);
    }
  }
);

publicRoutes.get("/bookings/:reference/status", async (req, res, next) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { reference: req.params.reference },
      include: { package: true, guest: true, priceLines: true, payments: true },
    });
    res.json(ok(booking ? publicBooking(booking) : null));
  } catch (e) {
    next(e);
  }
});
publicRoutes.post("/bookings/:reference/cancellation-request", validateBody(cancellationSchema), async (req, res, next) => {
  try {
    const reference = String(req.params.reference);
    const booking = await prisma.booking.findUnique({
      where: { reference },
    });
    if (!booking) {
      throw new ApiError(404, "BOOKING_NOT_FOUND", "Booking was not found.");
    }
    await prisma.auditLog.create({
      data: {
        action: "GUEST_CANCELLATION_REQUEST",
        entityType: "Booking",
        entityId: booking.reference,
        newValues: { reason: req.body.reason },
      },
    });
    res.json(ok({ received: true }));
  } catch (e) {
    next(e);
  }
});
