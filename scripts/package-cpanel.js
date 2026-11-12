const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const STAGING = path.join(ROOT, "dist-cpanel");
const ZIP_OUTPUT = path.join(ROOT, "cpanel_deploy.zip");

console.log("\n📦 Starting cPanel Deployment Packager...\n");

// 1. Verify / Build Backend API
const apiDist = path.join(ROOT, "apps", "api", "dist", "server.js");
if (!fs.existsSync(apiDist)) {
  console.log("⚡ Compiling Backend API...");
  execSync("npx tsc -p apps/api/tsconfig.json", { stdio: "inherit", cwd: ROOT });
} else {
  console.log("✅ Backend API is already compiled (apps/api/dist/server.js).");
}

// 2. Verify / Build Next.js Web Frontend
const buildId = path.join(ROOT, ".next", "BUILD_ID");
if (!fs.existsSync(buildId)) {
  console.log("⚡ Compiling Next.js Web Frontend...");
  execSync("npx next build", { stdio: "inherit", cwd: ROOT });
} else {
  console.log("✅ Next.js production build is already compiled (.next/BUILD_ID).");
}

// 3. Prepare Staging Directory
if (fs.existsSync(STAGING)) {
  fs.rmSync(STAGING, { recursive: true, force: true });
}
fs.mkdirSync(STAGING, { recursive: true });

function copyFile(relPath) {
  const src = path.join(ROOT, relPath);
  const dest = path.join(STAGING, relPath);
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  console.log(`  + [file] ${relPath}`);
}

function copyDir(relSrc, relDest, exclude = []) {
  const srcDir = path.join(ROOT, relSrc);
  const destDir = path.join(STAGING, relDest);
  if (!fs.existsSync(srcDir)) return;
  fs.mkdirSync(destDir, { recursive: true });

  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    if (exclude.includes(entry.name)) continue;
    const s = path.join(srcDir, entry.name);
    const d = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      fs.cpSync(s, d, { recursive: true });
    } else {
      fs.copyFileSync(s, d);
    }
  }
  console.log(`  + [dir]  ${relSrc} -> ${relDest}`);
}

console.log("\n📁 Copying files to staging...");

// Root deployment files
copyFile("app.js");
copyFile("package.json");
copyFile("package-lock.json");
copyFile("next.config.js");
copyFile(".htaccess");
copyFile("cpanel_database_setup.sql");
copyFile("CPANEL_DEPLOYMENT_GUIDE.md");

// Copy public assets & API compiled distribution
copyDir("public", "public");
copyDir(path.join("apps", "api", "dist"), path.join("apps", "api", "dist"));
copyFile(path.join("apps", "api", "prisma", "schema.prisma"));

// Copy .next production build (excluding cache to keep zip lightweight)
console.log("\n📦 Bundling Next.js frontend (.next and next_build fallback)...");
copyDir(".next", ".next", ["cache"]);
copyDir(".next", "next_build", ["cache"]);

// 4. Create ZIP archive
console.log(`\n🗜️  Compressing into ${path.basename(ZIP_OUTPUT)}...`);
if (fs.existsSync(ZIP_OUTPUT)) {
  fs.unlinkSync(ZIP_OUTPUT);
}

try {
  // Use PowerShell Compress-Archive for fast native Windows archiving
  const psCmd = `powershell -NoProfile -Command "Compress-Archive -Path '${STAGING}\\*' -DestinationPath '${ZIP_OUTPUT}' -Force"`;
  execSync(psCmd, { stdio: "inherit", cwd: ROOT });
  
  // Also append hidden dotfolders (.next) using PowerShell
  const psDotCmd = `powershell -NoProfile -Command "$src = '${STAGING}\\.next'; if (Test-Path $src) { Compress-Archive -Path $src -Update -DestinationPath '${ZIP_OUTPUT}' }"`;
  try {
    execSync(psDotCmd, { stdio: "ignore", cwd: ROOT });
  } catch (_) {}

  const stats = fs.statSync(ZIP_OUTPUT);
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

  console.log(`\n🎉 Success! Created ${path.basename(ZIP_OUTPUT)} (${sizeMB} MB)`);
  console.log(`📍 Location: ${ZIP_OUTPUT}`);
} finally {
  // Clean up staging directory
  try {
    fs.rmSync(STAGING, { recursive: true, force: true });
  } catch (_) {}
}
