const fs = require("fs/promises");
const path = require("path");
const { loadConfig } = require("../config");

async function exists(targetPath) {
  if (!targetPath) {
    return false;
  }

  return fs.access(targetPath).then(() => true).catch(() => false);
}

async function main() {
  const rootDir = path.resolve(__dirname, "..");
  const config = loadConfig({ rootDir });

  const report = {
    app: {
      host: config.app.host,
      port: config.app.port,
      tokenConfigured: Boolean(config.security.apiToken)
    },
    paths: {
      dataDir: await exists(config.paths.dataDir),
      mediaDir: await exists(config.paths.mediaDir),
      internalShared: config.paths.storage.internal_shared ? await exists(config.paths.storage.internal_shared) : "not_configured",
      externalOtg: config.paths.storage.external_otg ? await exists(config.paths.storage.external_otg) : "not_configured"
    },
    integrations: {
      mqttEmbeddedBroker: config.mqtt.embedded.enabled,
      fileBrowserEnabled: config.fileBrowser.enabled,
      fileBrowserBinaryPresent: await exists(config.fileBrowser.binaryPath),
      jellyfinEnabled: config.jellyfin.enabled,
      llamaModelPresent: await exists(config.llm.llama.modelPath)
    }
  };

  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
