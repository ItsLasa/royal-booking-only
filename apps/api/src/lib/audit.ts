import type { PrismaClient } from "@prisma/client";

export type AdminActor = { id: string; name: string; email: string; role: string };

export type AuditMeta = { ipAddress?: string; userAgent?: string };

export async function writeAudit(
  prisma: PrismaClient,
  actor: AdminActor | undefined,
  action: string,
  entityType: string,
  entityId: string | undefined,
  oldValues?: unknown,
  newValues?: unknown,
  meta?: AuditMeta,
) {
  return prisma.auditLog.create({
    data: {
      adminUserId: actor?.id,
      action,
      entityType,
      entityId,
      oldValues: oldValues as never,
      newValues: newValues as never,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    },
  });
}

export function auditMetaFrom(req: { ip?: string; get?: (header: string) => string | undefined }): AuditMeta {
  return { ipAddress: req.ip, userAgent: req.get?.("user-agent") };
}
