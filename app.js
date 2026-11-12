// cPanel Entry Point - Application Startup File for Phusion Passenger / Node.js App
const path = require("path");
const fs = require("fs");

function logErrorToFile(prefix, err) {
  const msg = `[${new Date().toISOString()}] ${prefix}: ${err?.stack || err?.message || err}\n`;
  try {
    fs.appendFileSync(path.join(__dirname, "api.err.log"), msg);
  } catch (_) {}
  console.error(msg);
}

process.on("uncaughtException", (err) => {
  logErrorToFile("UNCAUGHT EXCEPTION", err);
});

process.on("unhandledRejection", (reason) => {
  logErrorToFile("UNHANDLED REJECTION", reason);
});

// If separate DB variables are provided, construct DATABASE_URL automatically
if (!process.env.DATABASE_URL || process.env.DATABASE_URL.trim().length === 0) {
  const host = process.env.DB_HOST || "127.0.0.1";
  const port = process.env.DB_PORT || "3306";
  const user = process.env.DB_USER || "";
  const password = process.env.DB_PASSWORD || "";
  const database = process.env.DB_NAME || "";
  if (user && database) {
    process.env.DATABASE_URL = `mysql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
  }
}

// Look for compiled API entry points
const candidates = [
  path.join(__dirname, "apps", "api", "dist", "server.js"),
  path.join(__dirname, "dist", "server.js"),
  path.join(__dirname, "apps", "api", "dist", "src", "server.js"),
  path.join(__dirname, "dist", "src", "server.js")
];

let targetFile = null;
for (const candidate of candidates) {
  if (fs.existsSync(candidate)) {
    targetFile = candidate;
    break;
  }
}

if (!targetFile) {
  const errMsg = "Compiled application server file not found! Looked in:\n" + candidates.map((c) => " - " + c).join("\n");
  logErrorToFile("STARTUP ERROR", errMsg);

  // Emergency fallback server so cPanel doesn't show 503
  const express = require("express");
  const fallback = express();
  fallback.get("/health", (_req, res) => res.status(500).json({ ok: false, error: errMsg }));
  fallback.use((_req, res) => {
    res.status(500).type("html").send(`
      <!DOCTYPE html>
      <html>
        <head><title>Startup Error - Royal Mansion</title></head>
        <body style="font-family: sans-serif; padding: 40px; background: #0f172a; color: #f8fafc;">
          <h2>Application Server Not Compiled</h2>
          <p>The compiled entry point (<code>apps/api/dist/server.js</code>) was not found.</p>
          <pre style="background: #1e293b; padding: 16px; border-radius: 8px; color: #f43f5e;">${errMsg}</pre>
          <p>Please run <code>npm run build:api</code> or <code>npm run build</code> in the project directory.</p>
        </body>
      </html>
    `);
  });
  const port = process.env.PORT || 3000;
  if (process.env.NODE_ENV !== "test") {
    try {
      fallback.listen(port, () => console.log(`Fallback diagnostic server listening on port/socket: ${port}`));
    } catch (_) {}
  }
  module.exports = fallback;
} else {
  try {
    // Start application
    const exported = require(targetFile);
    const server = exported.default || exported.app || exported;
    module.exports = server;
  } catch (startupErr) {
    logErrorToFile("STARTUP EXCEPTION", startupErr);

    // Emergency fallback so cPanel doesn't crash with 503
    const express = require("express");
    const fallback = express();
    fallback.get("/health", (_req, res) => res.status(500).json({ ok: false, error: startupErr.message }));
    fallback.use((_req, res) => {
      res.status(500).type("html").send(`
        <!DOCTYPE html>
        <html>
          <head><title>Application Startup Error - Royal Mansion</title></head>
          <body style="font-family: sans-serif; padding: 40px; background: #0f172a; color: #f8fafc;">
            <h2>Application Startup Error</h2>
            <p>The server failed while loading <code>${targetFile}</code>:</p>
            <pre style="background: #1e293b; padding: 16px; border-radius: 8px; overflow: auto; color: #f43f5e;">${startupErr.stack || startupErr.message}</pre>
            <p>Common fixes:</p>
            <ul>
              <li>Verify that <code>DATABASE_URL</code> is correctly set in your <code>.env</code> file.</li>
              <li>Check that <code>SESSION_SECRET</code> and other required environment variables are set.</li>
            </ul>
          </body>
        </html>
      `);
    });
    const port = process.env.PORT || 3000;
    if (process.env.NODE_ENV !== "test") {
      try {
        fallback.listen(port, () => console.log(`Fallback diagnostic server listening on port/socket: ${port}`));
      } catch (_) {}
    }
    module.exports = fallback;
  }
}
