const { spawn } = require("child_process");
const path = require("path");
const { loadConfig } = require("../config");

async function main() {
  const rootDir = path.resolve(__dirname, "..");
  const config = loadConfig({ rootDir });
  const binaryPath = config.fileBrowser.binaryPath;

  if (!config.fileBrowser.enabled || !binaryPath) {
    console.error("File Browser disabled or binary path not configured.");
    process.exit(1);
  }

  const args = [
    "-r",
    config.fileBrowser.rootPath || config.paths.mediaDir,
    "-p",
    String(config.fileBrowser.port)
  ];

  const child = spawn(binaryPath, args, {
    stdio: "inherit"
  });

  child.on("exit", (code) => {
    process.exit(code || 0);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
