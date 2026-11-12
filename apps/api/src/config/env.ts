import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { z } from "zod";

function loadDotEnv() {
  const candidatePaths = [
    resolve(process.cwd(), ".env"),
    resolve(__dirname, ".env"),
    resolve(__dirname, "../../.env"),
    resolve(__dirname, "../../../.env"),
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
        if (process.env[key] === undefined) process.env[key] = value;
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
  SESSION_SECRET: z.string().min(16).default("development-session-secret-change-me"),
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
  CRON_SECRET: z.string().min(16).default("development-cron-secret"),
  BOOKING_HOLD_MINUTES: z.coerce.number().int().positive().default(15),
  MANAGE_BOOKING_TOKEN_SECRET: z.string().min(16).default("development-manage-token-secret"),
  ICAL_FEED_SECRET: z.string().min(16).default("development-ical-feed-secret"),
}).superRefine((data, ctx) => {
  if (data.NODE_ENV === "production") {
    if (data.SESSION_SECRET === "development-session-secret-change-me") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["SESSION_SECRET"],
        message: "SESSION_SECRET must be configured with a secure random string in production.",
      });
    }
    if (data.CRON_SECRET === "development-cron-secret") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["CRON_SECRET"],
        message: "CRON_SECRET must be configured with a secure random string in production.",
      });
    }
  }
});

export const env = envSchema.parse(process.env);
export type Env = typeof env;
