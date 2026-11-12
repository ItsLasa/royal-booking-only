import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { randomBytes } from "crypto";
import { z } from "zod";

function loadDotEnv() {
  const candidatePaths = [
    resolve(process.cwd(), ".env"),
    resolve(__dirname, ".env"),
    resolve(__dirname, "../.env"),
    resolve(__dirname, "../../.env"),
    resolve(__dirname, "../../../.env"),
    resolve(__dirname, "../../../../.env"),
    resolve(process.cwd(), "apps/api/.env"),
  ];

  for (const envPath of candidatePaths) {
    if (!existsSync(envPath)) continue;
    try {
      const content = readFileSync(envPath, "utf8");
      for (const rawLine of content.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith("#")) continue;
        const equalsIndex = line.indexOf("=");
        if (equalsIndex === -1) continue;
        const key = line.slice(0, equalsIndex).trim();
        let value = line.slice(equalsIndex + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        if (process.env[key] === undefined || process.env[key] === "") {
          process.env[key] = value;
        }
      }
      break;
    } catch {
      // Continue searching next candidate path
    }
  }
}

function buildDatabaseUrlFromParts(): string {
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length > 0) {
    return process.env.DATABASE_URL.trim();
  }

  const host = process.env.DB_HOST || "127.0.0.1";
  const port = process.env.DB_PORT || "3306";
  const user = process.env.DB_USER || "";
  const password = process.env.DB_PASSWORD || "";
  const database = process.env.DB_NAME || "";

  if (user && database) {
    const encodedUser = encodeURIComponent(user);
    const encodedPassword = encodeURIComponent(password);
    return `mysql://${encodedUser}:${encodedPassword}@${host}:${port}/${database}`;
  }

  return "";
}

loadDotEnv();

// If DATABASE_URL is not explicitly set, assemble it from separate DB_* variables
if (!process.env.DATABASE_URL || process.env.DATABASE_URL.trim().length === 0) {
  const constructed = buildDatabaseUrlFromParts();
  if (constructed) {
    process.env.DATABASE_URL = constructed;
  }
}

// In production, auto-generate secure 64-char random secrets if missing or using dev defaults
const DEV_SESSION_PLACEHOLDER = "development-session-secret-change-me";
const DEV_CRON_PLACEHOLDER = "development-cron-secret";
const DEV_MANAGE_PLACEHOLDER = "development-manage-token-secret";
const DEV_ICAL_PLACEHOLDER = "development-ical-feed-secret";

if (process.env.NODE_ENV === "production") {
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET === DEV_SESSION_PLACEHOLDER) {
    process.env.SESSION_SECRET = randomBytes(32).toString("hex");
    console.warn("⚠️ [SECURITY NOTICE] Auto-generated secure 64-char SESSION_SECRET for production.");
  }
  if (!process.env.CRON_SECRET || process.env.CRON_SECRET === DEV_CRON_PLACEHOLDER) {
    process.env.CRON_SECRET = randomBytes(32).toString("hex");
    console.warn("⚠️ [SECURITY NOTICE] Auto-generated secure 64-char CRON_SECRET for production.");
  }
  if (!process.env.MANAGE_BOOKING_TOKEN_SECRET || process.env.MANAGE_BOOKING_TOKEN_SECRET === DEV_MANAGE_PLACEHOLDER) {
    process.env.MANAGE_BOOKING_TOKEN_SECRET = randomBytes(32).toString("hex");
  }
  if (!process.env.ICAL_FEED_SECRET || process.env.ICAL_FEED_SECRET === DEV_ICAL_PLACEHOLDER) {
    process.env.ICAL_FEED_SECRET = randomBytes(32).toString("hex");
  }
}

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  FRONTEND_URL: z.string().url().default("http://localhost:3000"),
  API_URL: z.string().url().default("http://localhost:4000"),
  PORT: z.union([z.coerce.number(), z.string()]).default(4000),
  // Database configuration: accepts DATABASE_URL or separate DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
  DATABASE_URL: z
    .string()
    .min(1, "Database configuration missing: provide DB_USER, DB_PASSWORD, DB_NAME (and optionally DB_HOST, DB_PORT) or DATABASE_URL"),
  DB_HOST: z.string().optional().default("127.0.0.1"),
  DB_PORT: z.union([z.coerce.number(), z.string()]).optional().default(3306),
  DB_USER: z.string().optional(),
  DB_PASSWORD: z.string().optional(),
  DB_NAME: z.string().optional(),
  SESSION_SECRET: z.string().min(16).default(DEV_SESSION_PLACEHOLDER),
  PROPERTY_TIMEZONE: z.string().default("Asia/Colombo"),
  DEFAULT_CURRENCY: z.string().default("LKR"),
  PAYHERE_MODE: z.enum(["sandbox", "live"]).default("sandbox"),
  PAYHERE_MERCHANT_ID: z.string().default(""),
  PAYHERE_MERCHANT_SECRET: z.string().default(""),
  PAYHERE_NOTIFY_URL: z.string().url().optional(),
  PAYHERE_RETURN_URL: z.string().url().optional(),
  PAYHERE_CANCEL_URL: z.string().url().optional(),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  ADMIN_NOTIFICATION_EMAIL: z.string().email().optional(),
  CRON_SECRET: z.string().min(16).default(DEV_CRON_PLACEHOLDER),
  BOOKING_HOLD_MINUTES: z.coerce.number().int().positive().default(15),
  MANAGE_BOOKING_TOKEN_SECRET: z.string().min(16).default(DEV_MANAGE_PLACEHOLDER),
  ICAL_FEED_SECRET: z.string().min(16).default(DEV_ICAL_PLACEHOLDER),
}).superRefine((data) => {
  if (data.NODE_ENV === "production") {
    if (data.SESSION_SECRET === DEV_SESSION_PLACEHOLDER) {
      data.SESSION_SECRET = randomBytes(32).toString("hex");
    }
    if (data.CRON_SECRET === DEV_CRON_PLACEHOLDER) {
      data.CRON_SECRET = randomBytes(32).toString("hex");
    }
  }
});

export const env = envSchema.parse(process.env);
export type Env = typeof env;
