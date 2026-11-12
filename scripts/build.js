#!/usr/bin/env node
const { execSync } = require("child_process");

function run(cmd, desc) {
  console.log(`\n===> ${desc} (${cmd})...`);
  execSync(cmd, { stdio: "inherit" });
}

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

try {
  // 1. Generate Prisma Client
  run("npx prisma generate --schema apps/api/prisma/schema.prisma", "Generating Prisma Client");

  // 2. Compile API Server
  run("npx tsc -p apps/api/tsconfig.json", "Compiling Backend API (TypeScript)");

  // 3. Web build (optional or memory-safe)
  // On cPanel server-only deployments or low-RAM environments, allow skipping or safe-build
  const isServerOnly = process.env.SERVER_ONLY === "true" || process.env.BUILD_TARGET === "server";
  if (isServerOnly) {
    console.log("\n===> Skipping Next.js web build (SERVER_ONLY / BUILD_TARGET=server detected).");
  } else if (process.env.SKIP_WEB_BUILD === "true") {
    console.log("\n===> Skipping Next.js web build (SKIP_WEB_BUILD=true).");
  } else {
    try {
      console.log("\n===> Building Next.js Web Frontend (low-memory mode)...");
      execSync("npx next build", {
        stdio: "inherit",
        env: {
          ...process.env,
          NODE_OPTIONS: process.env.NODE_OPTIONS || "--max-old-space-size=1536",
        },
      });
    } catch (webErr) {
      console.warn("\n⚠️ Next.js web build encountered an issue or hit memory constraints.");
      console.warn("   If you are hosting the API in cPanel and the frontend in public_html (static export),");
      console.warn("   build the frontend locally with 'npm run build:web' and upload the 'out/' folder.");
      console.warn("   The backend API has already been compiled successfully to apps/api/dist/server.js!");
      if (process.env.REQUIRE_WEB_BUILD === "true") {
        throw webErr;
      }
    }
  }

  console.log("\n✅ Build completed successfully!");
} catch (err) {
  console.error("\n❌ Build failed:", err.message);
  process.exit(1);
}
