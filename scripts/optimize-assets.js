const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

async function optimizeAssets() {
  console.log("=== Starting Image Asset Optimization ===");

  // 1. Optimize public/logo.png & src/logo.png
  const logoPaths = [
    path.join(__dirname, "../public/logo.png"),
    path.join(__dirname, "../src/logo.png"),
  ];

  for (const logoPath of logoPaths) {
    if (fs.existsSync(logoPath)) {
      const backupPath = logoPath.replace(/\.png$/, ".original.png");
      if (!fs.existsSync(backupPath)) {
        fs.copyFileSync(logoPath, backupPath);
        console.log(`[Backup] Created ${backupPath}`);
      }

      const meta = await sharp(backupPath).metadata();
      console.log(`[Logo Before] ${logoPath}: ${meta.width}x${meta.height}, ${(fs.statSync(logoPath).size / 1024 / 1024).toFixed(2)} MB`);

      // Resize to high-DPI width 600px maintaining aspect ratio
      await sharp(backupPath)
        .resize({ width: 600, withoutEnlargement: true })
        .png({ quality: 90, compressionLevel: 9 })
        .toFile(logoPath + ".tmp");

      fs.renameSync(logoPath + ".tmp", logoPath);

      const newMeta = await sharp(logoPath).metadata();
      console.log(`[Logo After] ${logoPath}: ${newMeta.width}x${newMeta.height}, ${(fs.statSync(logoPath).size / 1024).toFixed(1)} KB`);
    }
  }

  // 2. Optimize large images in src/app/assets
  const assetsDir = path.join(__dirname, "../src/app/assets");
  const backupDir = path.join(assetsDir, ".original");
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const files = fs.readdirSync(assetsDir);
  for (const file of files) {
    const filePath = path.join(assetsDir, file);
    if (fs.statSync(filePath).isDirectory()) continue;

    try {
      const meta = await sharp(filePath).metadata();
      if (!meta.width || !meta.height) continue;

      // Only resize images wider or taller than 1920px, or files larger than 1MB
      const sizeBytes = fs.statSync(filePath).size;
      if (meta.width > 1920 || meta.height > 1920 || sizeBytes > 1024 * 1024) {
        const backupFile = path.join(backupDir, file);
        if (!fs.existsSync(backupFile)) {
          fs.copyFileSync(filePath, backupFile);
          console.log(`[Backup Asset] ${file} -> .original/${file}`);
        }

        console.log(`[Optimizing] ${file} (${meta.width}x${meta.height}, ${(sizeBytes / 1024 / 1024).toFixed(2)} MB)`);

        const pipeline = sharp(backupFile).resize({
          width: 1920,
          height: 1920,
          fit: "inside",
          withoutEnlargement: true,
        });

        if (meta.format === "jpeg" || meta.format === "jpg") {
          pipeline.jpeg({ quality: 82, mozjpeg: true });
        } else if (meta.format === "webp") {
          pipeline.webp({ quality: 82 });
        } else if (meta.format === "avif") {
          pipeline.avif({ quality: 75 });
        } else if (meta.format === "png") {
          pipeline.png({ quality: 85, compressionLevel: 8 });
        }

        const tmpPath = filePath + ".tmp";
        await pipeline.toFile(tmpPath);
        fs.renameSync(tmpPath, filePath);

        const newSize = fs.statSync(filePath).size;
        console.log(`[Optimized] ${file}: ${(sizeBytes / 1024 / 1024).toFixed(2)} MB -> ${(newSize / 1024).toFixed(1)} KB`);
      }
    } catch (err) {
      console.warn(`Could not process ${file}:`, err.message);
    }
  }

  console.log("=== Asset Optimization Finished Successfully ===");
}

optimizeAssets().catch(console.error);
