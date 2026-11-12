"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllSettings = getAllSettings;
exports.getSetting = getSetting;
exports.updateSettings = updateSettings;
const audit_1 = require("../lib/audit");
const DEFAULTS = {
    resort: { name: "Royal Mansion Resort Villa", tagline: "Private resort living in Pussallawa.", contactEmail: "", contactPhone: "", address: "Paradeka, Pussallawa", currency: "LKR" },
    taxes: { taxPercentage: 0, serviceChargePercentage: 10 },
    payments: { methods: [{ id: "cash", label: "Cash", enabled: true }, { id: "bank-transfer", label: "Bank transfer", enabled: true }, { id: "payhere", label: "Card (PayHere)", enabled: true }], bankInstructions: "" },
    cancellation: { policy: "Deposits are reviewed case by case. Free date changes up to 14 days before arrival, subject to availability.", freeCancellationDays: 14, refundPercentage: 100 },
    branding: { logoUrl: "", primaryColor: "#061b0e" },
    emailTemplates: { bookingConfirmed: { subject: "Your booking is confirmed", body: "Hi {guestName}, your booking {reference} is confirmed." } },
};
async function getAllSettings(prisma) {
    const rows = await prisma.adminSetting.findMany();
    const settings = { ...DEFAULTS };
    for (const row of rows)
        settings[row.key] = row.value ?? DEFAULTS[row.key];
    return settings;
}
async function getSetting(prisma, key) {
    const row = await prisma.adminSetting.findUnique({ where: { key } });
    return row?.value ?? DEFAULTS[key] ?? null;
}
async function updateSettings(prisma, actor, patch, meta) {
    const before = await getAllSettings(prisma);
    for (const [key, value] of Object.entries(patch)) {
        const existing = await prisma.adminSetting.findUnique({ where: { key } });
        if (existing)
            await prisma.adminSetting.update({ where: { key }, data: { value: value } });
        else
            await prisma.adminSetting.create({ data: { key, value: value } });
    }
    const after = await getAllSettings(prisma);
    await (0, audit_1.writeAudit)(prisma, actor, "SETTINGS_UPDATED", "AdminSetting", undefined, before, after, meta);
    return after;
}
