"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listStaff = listStaff;
exports.createStaff = createStaff;
exports.updateStaff = updateStaff;
exports.resetStaffPassword = resetStaffPassword;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const apiResponse_1 = require("../lib/apiResponse");
const audit_1 = require("../lib/audit");
async function listStaff(prisma, query) {
    const where = {
        ...(query.role ? { role: query.role } : {}),
        ...(query.search ? { OR: [{ name: { contains: query.search } }, { email: { contains: query.search } }] } : {}),
    };
    const [items, total] = await Promise.all([
        prisma.adminUser.findMany({ where, select: { id: true, name: true, email: true, role: true, active: true, lastLoginAt: true, createdAt: true, _count: { select: { sessions: true } } }, orderBy: { createdAt: "desc" } }),
        prisma.adminUser.count({ where }),
    ]);
    return { items, total };
}
async function createStaff(prisma, actor, input, meta) {
    const existing = await prisma.adminUser.findUnique({ where: { email: input.email.toLowerCase() } });
    if (existing)
        throw new apiResponse_1.ApiError(409, "EMAIL_IN_USE", "A staff member with this email already exists.");
    const staff = await prisma.adminUser.create({
        data: { name: input.name, email: input.email.toLowerCase(), passwordHash: await bcryptjs_1.default.hash(input.password, 12), role: input.role },
        select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
    });
    await (0, audit_1.writeAudit)(prisma, actor, "STAFF_CREATED", "AdminUser", staff.id, undefined, { name: staff.name, email: staff.email, role: staff.role }, meta);
    return staff;
}
async function updateStaff(prisma, actor, id, patch, meta) {
    if (actor.id === id && patch.active === false)
        throw new apiResponse_1.ApiError(409, "SELF_DEACTIVATE_FORBIDDEN", "You cannot deactivate your own account.");
    const existing = await prisma.adminUser.findUnique({ where: { id } });
    if (!existing)
        throw new apiResponse_1.ApiError(404, "STAFF_NOT_FOUND", "Staff member not found.");
    const updated = await prisma.adminUser.update({ where: { id }, data: { ...patch, role: patch.role }, select: { id: true, name: true, email: true, role: true, active: true, updatedAt: true } });
    await (0, audit_1.writeAudit)(prisma, actor, "STAFF_UPDATED", "AdminUser", id, { name: existing.name, role: existing.role, active: existing.active }, patch, meta);
    return updated;
}
async function resetStaffPassword(prisma, actor, id, newPassword, meta) {
    const existing = await prisma.adminUser.findUnique({ where: { id } });
    if (!existing)
        throw new apiResponse_1.ApiError(404, "STAFF_NOT_FOUND", "Staff member not found.");
    const updated = await prisma.adminUser.update({ where: { id }, data: { passwordHash: await bcryptjs_1.default.hash(newPassword, 12) }, select: { id: true, name: true, email: true } });
    await prisma.adminSession.updateMany({ where: { adminUserId: id, revokedAt: null }, data: { revokedAt: new Date() } });
    await (0, audit_1.writeAudit)(prisma, actor, "STAFF_PASSWORD_RESET", "AdminUser", id, undefined, { email: existing.email }, meta);
    return { ...updated, sessionsRevoked: true };
}
