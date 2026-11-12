import { PrismaClient } from "@prisma/client";
import { ApiError } from "../lib/apiResponse";
import { writeAudit, AdminActor, AuditMeta } from "../lib/audit";

export async function listRatesForPackage(prisma: PrismaClient, packageId: string) {
  const [pkg, seasonalRates, overrides] = await Promise.all([
    prisma.package.findUnique({ where: { id: packageId }, include: { property: true } }),
    prisma.seasonalRate.findMany({ where: { packageId }, orderBy: [{ priority: "desc" }, { startDate: "asc" }] }),
    prisma.dateRateOverride.findMany({ where: { packageId }, orderBy: { date: "asc" } }),
  ]);
  if (!pkg) throw new ApiError(404, "PACKAGE_NOT_FOUND", "Package not found.");
  return { package: pkg, seasonalRates, overrides };
}

export async function listAllRates(prisma: PrismaClient) {
  return prisma.package.findMany({ include: { unit: true, seasonalRates: true, dateOverrides: true }, orderBy: { displayOrder: "asc" } });
}

export async function createSeasonalRate(prisma: PrismaClient, actor: AdminActor, packageId: string, input: { name: string; startDate: string; endDate: string; nightlyPrice: string | number; weekendPrice?: string | number | null; minimumNights?: number | null; priority?: number }, meta?: AuditMeta) {
  const pkg = await prisma.package.findUnique({ where: { id: packageId } });
  if (!pkg) throw new ApiError(404, "PACKAGE_NOT_FOUND", "Package not found.");
  const rate = await prisma.seasonalRate.create({
    data: { packageId, name: input.name, startDate: new Date(`${input.startDate}T00:00:00.000Z`), endDate: new Date(`${input.endDate}T00:00:00.000Z`), nightlyPrice: input.nightlyPrice, weekendPrice: input.weekendPrice ?? null, minimumNights: input.minimumNights ?? null, priority: input.priority ?? 0 },
  });
  await writeAudit(prisma, actor, "SEASONAL_RATE_CREATED", "SeasonalRate", rate.id, undefined, input, meta);
  return rate;
}

export async function updateSeasonalRate(prisma: PrismaClient, actor: AdminActor, id: string, patch: Partial<{ name: string; startDate: string; endDate: string; nightlyPrice: string | number; weekendPrice: string | number | null; minimumNights: number | null; priority: number; active: boolean }>, meta?: AuditMeta) {
  const existing = await prisma.seasonalRate.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "RATE_NOT_FOUND", "Seasonal rate not found.");
  const data: Record<string, unknown> = { ...patch };
  if (patch.startDate) data.startDate = new Date(`${patch.startDate}T00:00:00.000Z`);
  if (patch.endDate) data.endDate = new Date(`${patch.endDate}T00:00:00.000Z`);
  const updated = await prisma.seasonalRate.update({ where: { id }, data: data as never });
  await writeAudit(prisma, actor, "SEASONAL_RATE_UPDATED", "SeasonalRate", id, existing, patch, meta);
  return updated;
}

export async function deleteSeasonalRate(prisma: PrismaClient, actor: AdminActor, id: string, meta?: AuditMeta) {
  const existing = await prisma.seasonalRate.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "RATE_NOT_FOUND", "Seasonal rate not found.");
  await prisma.seasonalRate.delete({ where: { id } });
  await writeAudit(prisma, actor, "SEASONAL_RATE_DELETED", "SeasonalRate", id, existing, undefined, meta);
  return { deleted: true };
}

export async function bulkApplyOverrides(prisma: PrismaClient, actor: AdminActor, packageId: string, input: { startDate: string; endDate: string; price?: string | number | null; closed?: boolean; closedToArrival?: boolean; closedToDeparture?: boolean; note?: string | null }, meta?: AuditMeta) {
  const pkg = await prisma.package.findUnique({ where: { id: packageId } });
  if (!pkg) throw new ApiError(404, "PACKAGE_NOT_FOUND", "Package not found.");
  const start = new Date(`${input.startDate}T00:00:00.000Z`);
  const end = new Date(`${input.endDate}T00:00:00.000Z`);
  const dates: Date[] = [];
  for (let cursor = new Date(start); cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 1)) dates.push(new Date(cursor));

  let count = 0;
  for (const date of dates) {
    const existing = await prisma.dateRateOverride.findUnique({ where: { packageId_date: { packageId, date } } });
    if (existing) {
      await prisma.dateRateOverride.update({ where: { packageId_date: { packageId, date } }, data: { price: input.price ?? existing.price, closed: input.closed ?? existing.closed, closedToArrival: input.closedToArrival ?? existing.closedToArrival, closedToDeparture: input.closedToDeparture ?? existing.closedToDeparture, note: input.note !== undefined ? input.note : existing.note } });
    } else {
      await prisma.dateRateOverride.create({ data: { packageId, date, price: input.price ?? null, closed: input.closed ?? false, closedToArrival: input.closedToArrival ?? false, closedToDeparture: input.closedToDeparture ?? false, note: input.note ?? null } });
    }
    count += 1;
  }
  await writeAudit(prisma, actor, "RATE_OVERRIDES_BULK", "Package", packageId, undefined, { startDate: input.startDate, endDate: input.endDate, count }, meta);
  return { applied: count };
}

export async function deleteOverride(prisma: PrismaClient, actor: AdminActor, id: string, meta?: AuditMeta) {
  const existing = await prisma.dateRateOverride.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "OVERRIDE_NOT_FOUND", "Date override not found.");
  await prisma.dateRateOverride.delete({ where: { id } });
  await writeAudit(prisma, actor, "RATE_OVERRIDE_DELETED", "DateRateOverride", id, existing, undefined, meta);
  return { deleted: true };
}

export async function bulkUpdatePackageRates(prisma: PrismaClient, actor: AdminActor, input: { packageIds: string[]; adjustmentPercent?: number; fixedAmount?: string | number }, meta?: AuditMeta) {
  if (!input.packageIds.length) throw new ApiError(400, "INVALID_INPUT", "Select at least one package.");
  if (input.adjustmentPercent === undefined && input.fixedAmount === undefined) throw new ApiError(400, "INVALID_INPUT", "Provide a percentage or fixed amount adjustment.");
  const packages = await prisma.package.findMany({ where: { id: { in: input.packageIds } } });
  const updated: string[] = [];
  for (const pkg of packages) {
    let next = Number(pkg.basePrice);
    if (input.adjustmentPercent !== undefined) next = next * (1 + input.adjustmentPercent / 100);
    if (input.fixedAmount !== undefined) next = next + Number(input.fixedAmount);
    await prisma.package.update({ where: { id: pkg.id }, data: { basePrice: Math.max(0, Math.round(next * 100) / 100) } });
    updated.push(pkg.id);
  }
  await writeAudit(prisma, actor, "RATES_BULK_UPDATED", "Package", undefined, undefined, input, meta);
  return { updated: updated.length };
}
