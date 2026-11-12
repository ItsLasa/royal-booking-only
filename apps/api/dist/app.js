"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const pino_http_1 = __importDefault(require("pino-http"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const env_1 = require("./config/env");
const publicRoutes_1 = require("./routes/publicRoutes");
const adminRoutes_1 = require("./routes/adminRoutes");
const adminAuthRoutes_1 = require("./routes/adminAuthRoutes");
const bookingAdminRoutes_1 = require("./routes/bookingAdminRoutes");
const paymentAdminRoutes_1 = require("./routes/paymentAdminRoutes");
const rateAdminRoutes_1 = require("./routes/rateAdminRoutes");
const roomAdminRoutes_1 = require("./routes/roomAdminRoutes");
const housekeepingRoutes_1 = require("./routes/housekeepingRoutes");
const maintenanceRoutes_1 = require("./routes/maintenanceRoutes");
const guestRoutes_1 = require("./routes/guestRoutes");
const reportRoutes_1 = require("./routes/reportRoutes");
const staffRoutes_1 = require("./routes/staffRoutes");
const settingsRoutes_1 = require("./routes/settingsRoutes");
const auditRoutes_1 = require("./routes/auditRoutes");
const paymentRoutes_1 = require("./routes/paymentRoutes");
const calendarRoutes_1 = require("./routes/calendarRoutes");
const cronRoutes_1 = require("./routes/cronRoutes");
const validation_1 = require("./middleware/validation");
function findNextDir() {
    const candidates = [
        process.cwd(),
        path_1.default.resolve(__dirname, "../../.."),
        path_1.default.resolve(__dirname, "../.."),
    ];
    for (const c of candidates) {
        if (fs_1.default.existsSync(path_1.default.join(c, ".next", "BUILD_ID"))) {
            return { dir: c, type: "standalone" };
        }
        if (fs_1.default.existsSync(path_1.default.join(c, "out", "index.html"))) {
            return { dir: c, type: "export" };
        }
    }
    return null;
}
function createApp() {
    const app = (0, express_1.default)();
    app.set("trust proxy", 1);
    app.use((0, helmet_1.default)({ contentSecurityPolicy: false }));
    app.use((0, cookie_parser_1.default)(env_1.env.SESSION_SECRET));
    app.use((0, pino_http_1.default)({
        autoLogging: {
            ignore: (req) => Boolean(req.url?.startsWith("/_next/") || req.url?.startsWith("/favicon") || req.url?.endsWith(".png") || req.url?.endsWith(".ico")),
        },
        redact: ["req.headers.authorization", "req.body.md5sig", "req.body.hash"],
    }));
    // Health check endpoint
    app.get("/health", (_req, res) => res.json({ ok: true }));
    // API router with CORS, rate limiting, and JSON parsing
    const apiRouter = express_1.default.Router();
    apiRouter.use((0, cors_1.default)({ origin: env_1.env.FRONTEND_URL, credentials: true }));
    apiRouter.use((0, express_rate_limit_1.default)({ windowMs: 60_000, limit: 120 }));
    apiRouter.use(express_1.default.json({ limit: "256kb" }));
    apiRouter.use(publicRoutes_1.publicRoutes, paymentRoutes_1.paymentRoutes, adminAuthRoutes_1.adminAuthRoutes, adminRoutes_1.adminRoutes, bookingAdminRoutes_1.bookingAdminRoutes, paymentAdminRoutes_1.paymentAdminRoutes, rateAdminRoutes_1.rateAdminRoutes, roomAdminRoutes_1.roomAdminRoutes, housekeepingRoutes_1.housekeepingRoutes, maintenanceRoutes_1.maintenanceRoutes, guestRoutes_1.guestRoutes, reportRoutes_1.reportRoutes, staffRoutes_1.staffRoutes, settingsRoutes_1.settingsRoutes, auditRoutes_1.auditRoutes, cronRoutes_1.cronRoutes, calendarRoutes_1.calendarRoutes);
    apiRouter.use(validation_1.errorHandler);
    app.use("/api/v1", apiRouter);
    // 404 for unhandled API routes
    app.use("/api", (_req, res) => {
        res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "API endpoint not found" } });
    });
    // Next.js Frontend Integration (serves /, /about, /packages, /book, /admin, /_next/*, etc.)
    const frontend = findNextDir();
    if (frontend && process.env.NODE_ENV !== "test") {
        if (frontend.type === "export") {
            const outDir = path_1.default.join(frontend.dir, "out");
            app.use(express_1.default.static(outDir));
            app.use((_req, res) => {
                res.sendFile(path_1.default.join(outDir, "index.html"));
            });
        }
        else {
            try {
                // eslint-disable-next-line @typescript-eslint/no-var-requires
                const next = require("next");
                const nextApp = next({ dev: false, dir: frontend.dir });
                let nextReady = false;
                let nextInitError = null;
                const handle = nextApp.getRequestHandler();
                const prep = nextApp.prepare()
                    .then(() => {
                    nextReady = true;
                    console.log("✅ Next.js web frontend ready!");
                })
                    .catch((err) => {
                    nextInitError = err;
                    console.error("❌ Failed to prepare Next.js:", err);
                });
                app.use(async (req, res, nextFn) => {
                    if (nextReady) {
                        try {
                            return await handle(req, res);
                        }
                        catch (err) {
                            return nextFn(err);
                        }
                    }
                    if (nextInitError) {
                        return res.status(500).type("html").send(`
              <!DOCTYPE html>
              <html>
                <head><title>Frontend Startup Error</title></head>
                <body style="font-family: sans-serif; padding: 40px; background: #0f172a; color: #f8fafc;">
                  <h2>Next.js Frontend Startup Error</h2>
                  <p>The backend API is running, but the Next.js frontend encountered an error while starting:</p>
                  <pre style="background: #1e293b; padding: 16px; border-radius: 8px; overflow: auto; color: #f43f5e;">${nextInitError.stack || nextInitError.message}</pre>
                </body>
              </html>
            `);
                    }
                    try {
                        await prep;
                        return await handle(req, res);
                    }
                    catch (err) {
                        return nextFn(err);
                    }
                });
            }
            catch (err) {
                console.warn("Notice: Next.js could not be attached:", err);
            }
        }
    }
    else if (process.env.NODE_ENV !== "test") {
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
