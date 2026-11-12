import { Prisma, PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { ApiError } from "../lib/apiResponse";
import { writeAudit, AdminActor, AuditMeta } from "../lib/audit";

export async function listStaff(prisma: PrismaClient, query: { search?: string; role?: string }) {
  const where: Prisma.AdminUserWhereInput = {
    ...(query.role ? { role: query.role as never } : {}),
    ...(query.search ? { OR: [{ name: { contains: query.search } }, { email: { contains: query.search } }] } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.adminUser.findMany({ where, select: { id: true, name: true, email: true, role: true, active: true, lastLoginAt: true, createdAt: true, _count: { select: { sessions: true } } }, orderBy: { createdAt: "desc" } }),
    prisma.adminUser.count({ where }),
  ]);
  return { items, total };
}

export async function createStaff(prisma: PrismaClient, actor: AdminActor, input: { name: string; email: string; password: string; role: string }, meta?: AuditMeta) {
  const existing = await prisma.adminUser.findUnique({ where: { email: input.email.toLowerCase() } });
  if (existing) throw new ApiError(409, "EMAIL_IN_USE", "A staff member with this email already exists.");
  const staff = await prisma.adminUser.create({
    data: { name: input.name, email: input.email.toLowerCase(), passwordHash: await bcrypt.hash(input.password, 12), role: input.role as never },
    select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
  });
  await writeAudit(prisma, actor, "STAFF_CREATED", "AdminUser", staff.id, undefined, { name: staff.name, email: staff.email, role: staff.role }, meta);
  return staff;
}

export async function updateStaff(prisma: PrismaClient, actor: AdminActor, id: string, patch: Partial<{ name: string; role: string; active: boolean }>, meta?: AuditMeta) {
  if (actor.id === id && patch.active === false) throw new ApiError(409, "SELF_DEACTIVATE_FORBIDDEN", "You cannot deactivate your own account.");
  const existing = await prisma.adminUser.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "STAFF_NOT_FOUND", "Staff member not found.");
  const updated = await prisma.adminUser.update({ where: { id }, data: { ...patch, role: patch.role as never }, select: { id: true, name: true, email: true, role: true, active: true, updatedAt: true } });
  await writeAudit(prisma, actor, "STAFF_UPDATED", "AdminUser", id, { name: existing.name, role: existing.role, active: existing.active }, patch, meta);
  return updated;
}

export async function resetStaffPassword(prisma: PrismaClient, actor: AdminActor, id: string, newPassword: string, meta?: AuditMeta) {
  const existing = await prisma.adminUser.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "STAFF_NOT_FOUND", "Staff member not found.");
  const updated = await prisma.adminUser.update({ where: { id }, data: { passwordHash: await bcrypt.hash(newPassword, 12) }, select: { id: true, name: true, email: true } });
  await prisma.adminSession.updateMany({ where: { adminUserId: id, revokedAt: null }, data: { revokedAt: new Date() } });
  await writeAudit(prisma, actor, "STAFF_PASSWORD_RESET", "AdminUser", id, undefined, { email: existing.email }, meta);
  return { ...updated, sessionsRevoked: true };
}
