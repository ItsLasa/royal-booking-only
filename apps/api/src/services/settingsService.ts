import { PrismaClient } from "@prisma/client";
import { writeAudit, AdminActor, AuditMeta } from "../lib/audit";

const DEFAULTS: Record<string, unknown> = {
  resort: { name: "Royal Mansion Resort Villa", tagline: "Private resort living in Pussallawa.", contactEmail: "", contactPhone: "", address: "Paradeka, Pussallawa", currency: "LKR" },
  taxes: { taxPercentage: 0, serviceChargePercentage: 10 },
  payments: { methods: [{ id: "cash", label: "Cash", enabled: true }, { id: "bank-transfer", label: "Bank transfer", enabled: true }, { id: "payhere", label: "Card (PayHere)", enabled: true }], bankInstructions: "" },
  cancellation: { policy: "Deposits are reviewed case by case. Free date changes up to 14 days before arrival, subject to availability.", freeCancellationDays: 14, refundPercentage: 100 },
  branding: { logoUrl: "", primaryColor: "#061b0e" },
  emailTemplates: { bookingConfirmed: { subject: "Your booking is confirmed", body: "Hi {guestName}, your booking {reference} is confirmed." } },
};

export async function getAllSettings(prisma: PrismaClient) {
  const rows = await prisma.adminSetting.findMany();
  const settings = { ...DEFAULTS };
  for (const row of rows) settings[row.key] = row.value ?? DEFAULTS[row.key];
  return settings;
}

export async function getSetting(prisma: PrismaClient, key: string) {
  const row = await prisma.adminSetting.findUnique({ where: { key } });
  return row?.value ?? DEFAULTS[key] ?? null;
}

export async function updateSettings(prisma: PrismaClient, actor: AdminActor, patch: Record<string, unknown>, meta?: AuditMeta) {
  const before = await getAllSettings(prisma);
  for (const [key, value] of Object.entries(patch)) {
    const existing = await prisma.adminSetting.findUnique({ where: { key } });
    if (existing) await prisma.adminSetting.update({ where: { key }, data: { value: value as never } });
    else await prisma.adminSetting.create({ data: { key, value: value as never } });
  }
  const after = await getAllSettings(prisma);
  await writeAudit(prisma, actor, "SETTINGS_UPDATED", "AdminSetting", undefined, before, after, meta);
  return after;
}
