import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";

const adminUser = {
  id: "admin_1",
  name: "Owner",
  email: "owner@example.test",
  passwordHash: bcrypt.hashSync("Correct123!", 10),
  role: "OWNER",
  active: true,
};
let sessionRecord: any = null;

vi.mock("../../src/config/env", () => ({
  env: {
    NODE_ENV: "test",
    FRONTEND_URL: "http://localhost:3000",
    API_URL: "http://localhost:4000",
    PORT: 4000,
    DATABASE_URL: "mysql://user:pass@localhost:3306/test",
    SESSION_SECRET: "test-session-secret-value",
    CRON_SECRET: "test-cron-secret-value",
    BOOKING_HOLD_MINUTES: 15,
    PAYHERE_MODE: "sandbox",
    PAYHERE_MERCHANT_ID: "merchant",
    PAYHERE_MERCHANT_SECRET: "secret",
  },
}));

vi.mock("../../src/lib/prisma", () => ({
  prisma: {
    adminUser: {
      findUnique: vi.fn(async ({ where }) => where.email === adminUser.email ? adminUser : null),
      update: vi.fn(async () => adminUser),
    },
    adminSession: {
      create: vi.fn(async ({ data }) => { sessionRecord = { id: "session_1", ...data, adminUser, revokedAt: null }; return sessionRecord; }),
      findUnique: vi.fn(async ({ where }) => sessionRecord && sessionRecord.tokenHash === where.tokenHash ? sessionRecord : null),
      update: vi.fn(async ({ data }) => { sessionRecord = { ...sessionRecord, ...data }; return sessionRecord; }),
    },
    auditLog: { create: vi.fn(async () => ({})), findMany: vi.fn(async () => []) },
    booking: {
      count: vi.fn(async () => 0),
      aggregate: vi.fn(async () => ({ _sum: { grandTotal: 0, amountPaid: 0 } })),
      findMany: vi.fn(async () => []),
      groupBy: vi.fn(async () => []),
    },
    unit: {
      findMany: vi.fn(async () => []),
    },
    payment: {
      findMany: vi.fn(async () => []),
    },
    maintenanceIssue: {
      findMany: vi.fn(async () => []),
    },
  },
}));

beforeEach(() => { sessionRecord = null; });

describe("admin auth sessions", () => {
  it("logs in, reads current admin, and logs out using signed cookies", async () => {
    const { createApp } = await import("../../src/app");
    const agent = request.agent(createApp());

    const login = await agent.post("/api/v1/admin/auth/login").send({ email: adminUser.email, password: "Correct123!" });
    expect(login.status).toBe(200);
    expect(login.body.data.user.email).toBe(adminUser.email);
    expect(String(login.headers["set-cookie"])).toContain("rmv_admin_session");

    const me = await agent.get("/api/v1/admin/auth/me");
    expect(me.status).toBe(200);
    expect(me.body.data.user.role).toBe("OWNER");

    const dashboard = await agent.get("/api/v1/admin/dashboard");
    expect(dashboard.status).toBe(200);

    const logout = await agent.post("/api/v1/admin/auth/logout");
    expect(logout.status).toBe(200);

    const afterLogout = await agent.get("/api/v1/admin/auth/me");
    expect(afterLogout.status).toBe(401);
  }, 30000);

  it("rejects invalid credentials", async () => {
    const { createApp } = await import("../../src/app");
    const response = await request(createApp()).post("/api/v1/admin/auth/login").send({ email: adminUser.email, password: "Wrong123!" });
    expect(response.status).toBe(401);
  }, 30000);
});
