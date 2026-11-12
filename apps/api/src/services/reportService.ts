import { Prisma, PrismaClient } from "@prisma/client";

const statusRevenue = ["HOLD", "PENDING_PAYMENT", "PAYMENT_PROCESSING", "CONFIRMED", "COMPLETED"] as never[];
const dateRange = (from?: string, to?: string) => ({
  ...(from ? { gte: new Date(`${from}T00:00:00.000Z`) } : {}),
  ...(to ? { lte: new Date(`${to}T00:00:00.000Z`) } : {}),
});

export async function getRevenueReport(prisma: PrismaClient, query: { from?: string; to?: string }) {
  const range = dateRange(query.from, query.to);
  const bookings = await prisma.booking.findMany({
    where: { createdAt: range, bookingStatus: { not: "CANCELLED" } },
    select: { createdAt: true, grandTotal: true, amountPaid: true, source: true, packageId: true, bookingStatus: true },
  });

  const monthKeys = new Set<string>();
  for (const b of bookings) monthKeys.add(b.createdAt.toISOString().slice(0, 7));
  if (monthKeys.size === 0) monthKeys.add(new Date().toISOString().slice(0, 7));

  const byMonth = [...monthKeys].sort().map((month) => {
    const slice = bookings.filter((b) => b.createdAt.toISOString().slice(0, 7) === month);
    return {
      month,
      revenue: slice.reduce((sum, b) => sum + Number(b.grandTotal), 0),
      paid: slice.reduce((sum, b) => sum + Number(b.amountPaid), 0),
      bookings: slice.length,
    };
  });

  const bySource = Object.entries(
    bookings.reduce<Record<string, { bookings: number; revenue: number }>>((acc, b) => {
      const key = b.source;
      acc[key] = acc[key] ?? { bookings: 0, revenue: 0 };
      acc[key].bookings += 1;
      acc[key].revenue += Number(b.grandTotal);
      return acc;
    }, {}),
  ).map(([source, value]) => ({ source, ...value }));

  const byPackageRows = await prisma.booking.groupBy({ by: ["packageId"], _count: true, _sum: { grandTotal: true, amountPaid: true }, where: { createdAt: range, bookingStatus: { not: "CANCELLED" } } });
  const packages = await prisma.package.findMany({ where: { id: { in: byPackageRows.map((r) => r.packageId) } }, select: { id: true, name: true } });
  const byPackage = byPackageRows.map((row) => ({
    packageId: row.packageId,
    name: packages.find((p) => p.id === row.packageId)?.name ?? "Unknown",
    bookings: row._count,
    revenue: row._sum.grandTotal ?? 0,
    paid: row._sum.amountPaid ?? 0,
  }));

  const totalRevenue = byMonth.reduce((sum, m) => sum + m.revenue, 0);
  const totalPaid = byMonth.reduce((sum, m) => sum + m.paid, 0);
  return { byMonth, bySource, byPackage, totals: { revenue: totalRevenue, paid: totalPaid, bookings: bookings.length } };
}

export async function getOccupancyReport(prisma: PrismaClient, query: { from?: string; to?: string }) {
  const from = query.from ? new Date(`${query.from}T00:00:00.000Z`) : new Date(`${new Date().getFullYear()}-01-01T00:00:00.000Z`);
  const to = query.to ? new Date(`${query.to}T00:00:00.000Z`) : new Date(`${new Date().getFullYear()}-12-31T00:00:00.000Z`);

  const [units, bookings] = await Promise.all([
    prisma.unit.findMany({ select: { id: true, name: true, inventoryCount: true } }),
    prisma.booking.findMany({ where: { bookingStatus: { in: statusRevenue }, checkOutDate: { gt: from }, checkInDate: { lt: to } }, select: { checkInDate: true, checkOutDate: true, unitId: true, nights: true, grandTotal: true } }),
  ]);

  const capacity = units.reduce((sum, u) => sum + u.inventoryCount, 0);
  const totalNights = Math.round((to.getTime() - from.getTime()) / 86_400_000);
  const capacityNights = capacity * totalNights;
  const soldNights = bookings.reduce((sum, b) => sum + b.nights, 0);
  const occupancyPct = capacityNights > 0 ? (soldNights / capacityNights) * 100 : 0;

  const roomsSoldNights = soldNights;
  const adr = roomsSoldNights > 0 ? bookings.reduce((sum, b) => sum + Number(b.grandTotal), 0) / roomsSoldNights : 0;
  const revpar = capacityNights > 0 ? bookings.reduce((sum, b) => sum + Number(b.grandTotal), 0) / capacityNights : 0;

  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10), units, totalNights, capacity, capacityNights, soldNights, occupancyPct: Number(occupancyPct.toFixed(2)), adr: Number(adr.toFixed(2)), revpar: Number(revpar.toFixed(2)), bookings: bookings.length };
}

export async function getPaymentsReport(prisma: PrismaClient, query: { from?: string; to?: string }) {
  const range = dateRange(query.from, query.to);
  const payments = await prisma.payment.findMany({ where: { createdAt: range }, include: { booking: { include: { guest: true } } }, orderBy: { createdAt: "desc" }, take: 1000 });
  const byProvider = Object.entries(
    payments.reduce<Record<string, { count: number; total: number; refunded: number }>>((acc, p) => {
      const key = p.provider;
      acc[key] = acc[key] ?? { count: 0, total: 0, refunded: 0 };
      acc[key].count += 1;
      if (p.status === "REFUNDED" || p.status === "PARTIALLY_REFUNDED") acc[key].refunded += Number(p.amount);
      else acc[key].total += Number(p.amount);
      return acc;
    }, {}),
  ).map(([provider, value]) => ({ provider, ...value }));

  const byStatus = Object.entries(
    payments.reduce<Record<string, number>>((acc, p) => {
      acc[p.status] = (acc[p.status] ?? 0) + 1;
      return acc;
    }, {}),
  ).map(([status, count]) => ({ status, count }));

  return {
    payments,
    byProvider,
    byStatus,
    totals: {
      collected: payments.filter((p) => !["REFUNDED", "PARTIALLY_REFUNDED"].includes(p.status)).reduce((sum, p) => sum + Number(p.amount), 0),
      refunded: payments.filter((p) => ["REFUNDED", "PARTIALLY_REFUNDED"].includes(p.status)).reduce((sum, p) => sum + Number(p.amount), 0),
      count: payments.length,
    },
  };
}

export async function getCancellationReport(prisma: PrismaClient, query: { from?: string; to?: string }) {
  const range = dateRange(query.from, query.to);
  const [total, cancelled] = await Promise.all([
    prisma.booking.count({ where: { createdAt: range } }),
    prisma.booking.count({ where: { createdAt: range, bookingStatus: "CANCELLED" } }),
  ]);
  return { total, cancelled, cancellationRate: total > 0 ? Number(((cancelled / total) * 100).toFixed(2)) : 0 };
}

function csvEscape(value: unknown) {
  let str = String(value ?? "");
  // Neutralize CSV Formula Injection (CWE-1236) in Excel, LibreOffice, Google Sheets
  if (/^[=\+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export function toCsv(headers: string[], rows: unknown[][]) {
  return [headers.map(csvEscape).join(","), ...rows.map((row) => row.map(csvEscape).join(","))].join("\n");
}

export async function exportBookingsCsv(prisma: PrismaClient, query: { from?: string; to?: string }) {
  const bookings = await prisma.booking.findMany({
    where: { ...(query.from || query.to ? { createdAt: dateRange(query.from, query.to) } : {}) },
    include: { guest: true, package: true },
    orderBy: { createdAt: "desc" },
    take: 2000,
  });
  const headers = ["Reference", "Guest", "Email", "Phone", "Package", "Check-in", "Check-out", "Nights", "Adults", "Children", "Grand Total", "Amount Paid", "Balance", "Booking Status", "Payment Status", "Source", "Created"];
  const rows = bookings.map((b) => [
    b.reference,
    `${b.guest.firstName} ${b.guest.lastName}`,
    b.guest.email,
    b.guest.phone,
    b.package.name,
    b.checkInDate.toISOString().slice(0, 10),
    b.checkOutDate.toISOString().slice(0, 10),
    b.nights,
    b.adults,
    b.children,
    Number(b.grandTotal),
    Number(b.amountPaid),
    Number(b.balanceDue),
    b.bookingStatus,
    b.paymentStatus,
    b.source,
    b.createdAt.toISOString(),
  ]);
  return { filename: `bookings-${new Date().toISOString().slice(0, 10)}.csv`, csv: toCsv(headers, rows) };
}

export async function exportPaymentsCsv(prisma: PrismaClient, query: { from?: string; to?: string }) {
  const payments = await prisma.payment.findMany({
    where: { ...(query.from || query.to ? { createdAt: dateRange(query.from, query.to) } : {}) },
    include: { booking: { include: { guest: true } } },
    orderBy: { createdAt: "desc" },
    take: 2000,
  });
  const headers = ["Reference", "Guest", "Provider", "Amount", "Currency", "Status", "Verified", "Method", "Processed At", "Created"];
  const rows = payments.map((p) => [
    p.booking.reference,
    `${p.booking.guest.firstName} ${p.booking.guest.lastName}`,
    p.provider,
    Number(p.amount),
    p.currency,
    p.status,
    p.verified ? "Yes" : "No",
    p.paymentMethod ?? "",
    p.processedAt?.toISOString() ?? "",
    p.createdAt.toISOString(),
  ]);
  return { filename: `payments-${new Date().toISOString().slice(0, 10)}.csv`, csv: toCsv(headers, rows) };
}
