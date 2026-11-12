import crypto from "crypto";
import type { AdminUser } from "@prisma/client";

export const ADMIN_SESSION_COOKIE = "rmv_admin_session";
export const ADMIN_SESSION_DAYS = 7;

export function createSessionToken() {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashSessionToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function publicAdminUser(user: Pick<AdminUser, "id" | "name" | "email" | "role">) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}
