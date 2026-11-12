"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPackage = createPackage;
exports.updatePackage = updatePackage;
exports.deactivatePackage = deactivatePackage;
const apiResponse_1 = require("../lib/apiResponse");
const audit_1 = require("../lib/audit");
async function createPackage(prisma, actor, input, meta) {
    const property = await prisma.property.findFirst();
    if (!property)
        throw new apiResponse_1.ApiError(404, "PROPERTY_NOT_FOUND", "No property configured.");
    const unitId = String(input.unitId ?? "");
    const unit = unitId ? await prisma.unit.findUnique({ where: { id: unitId } }) : await prisma.unit.findFirst({ where: { active: true } });
    if (!unit)
        throw new apiResponse_1.ApiError(404, "UNIT_NOT_FOUND", "No room unit found for this package.");
    const { imageUrls, ...data } = input;
    const pkg = await prisma.package.create({
        data: {
            propertyId: property.id,
            unitId: unit.id,
            name: String(data.name),
            slug: String(data.slug),
            shortDescription: String(data.shortDescription ?? ""),
            fullDescription: String(data.fullDescription ?? ""),
            basePrice: data.basePrice ?? 0,
            pricingType: (data.pricingType ?? "PER_NIGHT"),
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
            images: imageUrls?.length ? { create: imageUrls.map((url, index) => ({ imageUrl: url, altText: data.name, displayOrder: index + 1 })) } : undefined,
        },
        include: { images: true, unit: true },
    });
    await (0, audit_1.writeAudit)(prisma, actor, "PACKAGE_CREATED", "Package", pkg.id, undefined, { name: pkg.name, slug: pkg.slug, basePrice: pkg.basePrice }, meta);
    return pkg;
}
async function updatePackage(prisma, actor, id, patch, meta) {
    const existing = await prisma.package.findUnique({ where: { id } });
    if (!existing)
        throw new apiResponse_1.ApiError(404, "PACKAGE_NOT_FOUND", "Package not found.");
    const { imageUrls, ...data } = patch;
    const updateData = { ...data };
    if (imageUrls) {
        await prisma.packageImage.deleteMany({ where: { packageId: id } });
        updateData.images = { create: imageUrls.map((url, index) => ({ imageUrl: url, altText: patch.name ?? existing.name, displayOrder: index + 1 })) };
    }
    const updated = await prisma.package.update({ where: { id }, data: updateData, include: { images: true, unit: true } });
    await (0, audit_1.writeAudit)(prisma, actor, "PACKAGE_UPDATED", "Package", id, { name: existing.name, basePrice: existing.basePrice }, patch, meta);
    return updated;
}
async function deactivatePackage(prisma, actor, id, meta) {
    const existing = await prisma.package.findUnique({ where: { id } });
    if (!existing)
        throw new apiResponse_1.ApiError(404, "PACKAGE_NOT_FOUND", "Package not found.");
    const updated = await prisma.package.update({ where: { id }, data: { active: false } });
    await (0, audit_1.writeAudit)(prisma, actor, "PACKAGE_DEACTIVATED", "Package", id, { active: existing.active }, { active: false }, meta);
    return updated;
}
