import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import path from "path";
import fs from "fs";
import { env } from "./config/env";
import { publicRoutes } from "./routes/publicRoutes";
import { adminRoutes } from "./routes/adminRoutes";
import { adminAuthRoutes } from "./routes/adminAuthRoutes";
import { bookingAdminRoutes } from "./routes/bookingAdminRoutes";
import { paymentAdminRoutes } from "./routes/paymentAdminRoutes";
import { rateAdminRoutes } from "./routes/rateAdminRoutes";
import { roomAdminRoutes } from "./routes/roomAdminRoutes";
import { housekeepingRoutes } from "./routes/housekeepingRoutes";
import { maintenanceRoutes } from "./routes/maintenanceRoutes";
import { guestRoutes } from "./routes/guestRoutes";
import { reportRoutes } from "./routes/reportRoutes";
import { staffRoutes } from "./routes/staffRoutes";
import { settingsRoutes } from "./routes/settingsRoutes";
import { auditRoutes } from "./routes/auditRoutes";
import { paymentRoutes } from "./routes/paymentRoutes";
import { calendarRoutes } from "./routes/calendarRoutes";
import { cronRoutes } from "./routes/cronRoutes";
import { errorHandler } from "./middleware/validation";

function findNextDir(): { dir: string; type: "standalone" | "export"; distDir?: string } | null {
  const candidates = [
    process.cwd(),
    path.resolve(__dirname, "../../.."),
    path.resolve(__dirname, "../.."),
    path.resolve(__dirname, "../../../.."),
  ];
  for (const c of candidates) {
    if (fs.existsSync(path.join(c, "out", "index.html"))) {
      return { dir: c, type: "export" };
    }
    // Standard .next directory
    const buildId = path.join(c, ".next", "BUILD_ID");
    const routesManifest = path.join(c, ".next", "routes-manifest.json");
    if (fs.existsSync(buildId) && fs.existsSync(routesManifest)) {
      return { dir: c, type: "standalone", distDir: ".next" };
    }
    // Non-hidden next_build fallback for cPanel / FTP systems that strip dot-folders
    const altBuildId = path.join(c, "next_build", "BUILD_ID");
    const altRoutesManifest = path.join(c, "next_build", "routes-manifest.json");
    if (fs.existsSync(altBuildId) && fs.existsSync(altRoutesManifest)) {
      return { dir: c, type: "standalone", distDir: "next_build" };
    }
  }
  return null;
}

export function createApp() {
  const app = express();
  app.set("trust proxy", 1);
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
          imgSrc: ["'self'", "data:", "blob:", "https:"],
          connectSrc: ["'self'", env.FRONTEND_URL, env.API_URL, "https://*.payhere.lk", "https://wa.me"],
          frameSrc: ["'self'", "https://*.payhere.lk"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'", "https://*.payhere.lk"],
        },
      },
      crossOriginEmbedderPolicy: false,
    })
  );
  app.use(cookieParser(env.SESSION_SECRET));

  app.use(
    pinoHttp({
      autoLogging: {
        ignore: (req) => Boolean(req.url?.startsWith("/_next/") || req.url?.startsWith("/favicon") || req.url?.endsWith(".png") || req.url?.endsWith(".ico")),
      },
      redact: ["req.headers.authorization", "req.body.md5sig", "req.body.hash"],
    })
  );

  // Health check endpoint
  app.get("/health", (_req, res) => res.json({ ok: true }));

  // API router with CORS, rate limiting, and JSON parsing
  const apiRouter = express.Router();
  apiRouter.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
  apiRouter.use(rateLimit({ windowMs: 60_000, limit: 120 }));
  apiRouter.use(express.json({ limit: "256kb" }));

  apiRouter.use(
    publicRoutes,
    paymentRoutes,
    adminAuthRoutes,
    adminRoutes,
    bookingAdminRoutes,
    paymentAdminRoutes,
    rateAdminRoutes,
    roomAdminRoutes,
    housekeepingRoutes,
    maintenanceRoutes,
    guestRoutes,
    reportRoutes,
    staffRoutes,
    settingsRoutes,
    auditRoutes,
    cronRoutes,
    calendarRoutes
  );
  apiRouter.use(errorHandler);

  app.use("/api/v1", apiRouter);

  // 404 for unhandled API routes
  app.use("/api", (_req, res) => {
    res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "API endpoint not found" } });
  });

  // Next.js Frontend Integration (serves /, /about, /packages, /book, /admin, /_next/*, etc.)
  // Only embed Next.js in production (e.g. cPanel). In development, `next dev` runs separately on port 3000.
  const isProduction = process.env.NODE_ENV === "production";
  const frontend = isProduction ? findNextDir() : null;
  if (frontend && process.env.NODE_ENV !== "test") {
    if (frontend.type === "export") {
      const outDir = path.join(frontend.dir, "out");
      app.use(express.static(outDir));
      app.use((_req, res) => {
        res.sendFile(path.join(outDir, "index.html"));
      });
    } else {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const next = require("next");
        const nextApp = next({
          dev: false,
          dir: frontend.dir,
          conf: frontend.distDir ? { distDir: frontend.distDir } : undefined,
        });
        let nextReady = false;
        let nextInitError: Error | null = null;
        const handle = nextApp.getRequestHandler();

        const prep = nextApp.prepare()
          .then(() => {
            nextReady = true;
            console.log("✅ Next.js web frontend ready!");
          })
          .catch((err: Error) => {
            nextInitError = err;
            console.error("❌ Failed to prepare Next.js:", err);
          });

        app.use(async (req, res, nextFn) => {
          if (nextReady) {
            try {
              return await handle(req, res);
            } catch (err) {
              return nextFn(err);
            }
          }

          if (nextInitError) {
            const errorDetails = env.NODE_ENV === "production"
              ? "The web application is temporarily undergoing maintenance. Please try again shortly or contact support."
              : nextInitError.stack || nextInitError.message;
            return res.status(500).type("html").send(`
              <!DOCTYPE html>
              <html>
                <head><title>Service Temporarily Unavailable</title></head>
                <body style="font-family: sans-serif; padding: 40px; background: #0f172a; color: #f8fafc; text-align: center;">
                  <h2>Royal Mansion Resort & Villa</h2>
                  <p>${errorDetails}</p>
                </body>
              </html>
            `);
          }

          try {
            await prep;
            return await handle(req, res);
          } catch (err) {
            return nextFn(err);
          }
        });
      } catch (err) {
        console.warn("Notice: Next.js could not be attached:", err);
      }
    }
  } else if (process.env.NODE_ENV !== "test") {
    // If neither .next nor out exists, provide a friendly status page instead of a blank 404/503
    app.use((_req, res) => {
      res.status(200).type("html").send(`
        <!DOCTYPE html>
        <html>
          <head><title>Royal Mansion Resort & Villa</title></head>
          <body style="font-family: sans-serif; padding: 40px; background: #0f172a; color: #f8fafc; text-align: center;">
            <h2>Royal Mansion Resort & Villa API Server</h2>
            <p>Backend API is active and healthy: <a href="/health" style="color: #38bdf8;">/health</a></p>
            <p style="color: #94a3b8;">Frontend build (<code>.next/BUILD_ID</code>) not detected yet. Run <code>npm run build</code> or deploy frontend static export to complete setup.</p>
          </body>
        </html>
      `);
    });
  }

  return app;
}
