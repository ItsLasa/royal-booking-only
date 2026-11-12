import { PrismaClient } from "@prisma/client";
import { ApiError } from "../lib/apiResponse";
import { writeAudit, AdminActor, AuditMeta } from "../lib/audit";

export async function createPackage(prisma: PrismaClient, actor: AdminActor, input: Record<string, unknown>, meta?: AuditMeta) {
  const property = await prisma.property.findFirst();
  if (!property) throw new ApiError(404, "PROPERTY_NOT_FOUND", "No property configured.");
  const unitId = String(input.unitId ?? "");
  const unit = unitId ? await prisma.unit.findUnique({ where: { id: unitId } }) : await prisma.unit.findFirst({ where: { active: true } });
  if (!unit) throw new ApiError(404, "UNIT_NOT_FOUND", "No room unit found for this package.");

  const { imageUrls, ...data } = input as Record<string, never> & { imageUrls?: string[] };
  const pkg = await prisma.package.create({
    data: {
      propertyId: property.id,
      unitId: unit.id,
      name: String(data.name),
      slug: String(data.slug),
      shortDescription: String(data.shortDescription ?? ""),
      fullDescription: String(data.fullDescription ?? ""),
      basePrice: data.basePrice ?? 0,
      pricingType: (data.pricingType ?? "PER_NIGHT") as never,
      includedAdults: Number(data.includedAdults ?? 2),
      includedChildren: Number(data.includedChildren ?? 0),
      maximumGuests: Number(data.maximumGuests ?? 10),
      minimumNights: Number(data.minimumNights ?? 1),
      maximumNights: Number(data.maximumNights ?? 30),
      depositPercentage: data.depositPercentage ?? 50,
      mealPlan: data.mealPlan ?? null,
      cancellationPolicy: String(data.cancellationPolicy ?? ""),
      terms: String(data.terms ?? ""),
      featured: Boolean(data.featured ?? false),
      active: data.active !== false,
      displayOrder: Number(data.displayOrder ?? 0),
      images: imageUrls?.length ? { create: imageUrls.map((url, index) => ({ imageUrl: url, altText: data.name as string, displayOrder: index + 1 })) } : undefined,
    },
    include: { images: true, unit: true },
  });
  await writeAudit(prisma, actor, "PACKAGE_CREATED", "Package", pkg.id, undefined, { name: pkg.name, slug: pkg.slug, basePrice: pkg.basePrice }, meta);
  return pkg;
}

export async function updatePackage(prisma: PrismaClient, actor: AdminActor, id: string, patch: Record<string, unknown>, meta?: AuditMeta) {
  const existing = await prisma.package.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "PACKAGE_NOT_FOUND", "Package not found.");
  const { imageUrls, ...data } = patch as Record<string, never> & { imageUrls?: string[] };

  const updateData: Record<string, unknown> = { ...data };
  if (imageUrls) {
    await prisma.packageImage.deleteMany({ where: { packageId: id } });
    updateData.images = { create: imageUrls.map((url, index) => ({ imageUrl: url, altText: (patch.name as string) ?? existing.name, displayOrder: index + 1 })) };
  }

  const updated = await prisma.package.update({ where: { id }, data: updateData as never, include: { images: true, unit: true } });
  await writeAudit(prisma, actor, "PACKAGE_UPDATED", "Package", id, { name: existing.name, basePrice: existing.basePrice }, patch, meta);
  return updated;
}

export async function deactivatePackage(prisma: PrismaClient, actor: AdminActor, id: string, meta?: AuditMeta) {
  const existing = await prisma.package.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "PACKAGE_NOT_FOUND", "Package not found.");
  const updated = await prisma.package.update({ where: { id }, data: { active: false } });
  await writeAudit(prisma, actor, "PACKAGE_DEACTIVATED", "Package", id, { active: existing.active }, { active: false }, meta);
  return updated;
}
