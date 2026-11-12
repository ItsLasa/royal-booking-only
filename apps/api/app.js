// cPanel Entry Point when 'apps/api' is set as Application Root
const path = require("path");
const fs = require("fs");

const candidates = [
  path.join(__dirname, "dist", "server.js"),
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
  console.error("==================================================================");
  console.error("ERROR: Compiled application server file not found in apps/api/dist!");
  console.error("Please run 'npm run build:api' before starting.");
  console.error("==================================================================");
  process.exit(1);
}

const exported = require(targetFile);
const server = exported.default || exported.app || exported;

module.exports = server;
