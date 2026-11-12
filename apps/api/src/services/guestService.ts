import { PrismaClient } from "@prisma/client";
import { ApiError } from "../lib/apiResponse";

export async function listGuests(prisma: PrismaClient, query: { search?: string; page?: number; pageSize?: number }) {
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
  const where = query.search
    ? {
        OR: [
          { firstName: { contains: query.search } },
          { lastName: { contains: query.search } },
          { email: { contains: query.search } },
          { phone: { contains: query.search } },
        ],
      }
    : {};
  const [items, total] = await Promise.all([
    prisma.guest.findMany({ where, include: { _count: { select: { bookings: true } } }, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.guest.count({ where }),
  ]);
  return { items, total, page, pageSize, pages: Math.ceil(total / pageSize) };
}

export async function getGuestDetail(prisma: PrismaClient, id: string) {
  const guest = await prisma.guest.findUnique({ where: { id } });
  if (!guest) throw new ApiError(404, "GUEST_NOT_FOUND", "Guest not found.");
  const bookings = await prisma.booking.findMany({
    where: { guestId: id },
    include: { package: true, payments: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const totals = bookings.reduce((acc, b) => {
    acc.spent = (Number(acc.spent) + Number(b.amountPaid)).toFixed(2);
    return acc;
  }, { spent: "0" });
  return { ...guest, bookings, totals };
}

export async function updateGuest(prisma: PrismaClient, id: string, patch: Partial<{ country: string | null; address: string | null; identityDocumentReference: string | null; marketingConsent: boolean; preferences: Record<string, unknown>; internalNotes: string | null }>) {
  const existing = await prisma.guest.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "GUEST_NOT_FOUND", "Guest not found.");
  return prisma.guest.update({ where: { id }, data: patch as never });
}
