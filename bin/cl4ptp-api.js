const path = require("path");
const { loadConfig } = require("../config");
const { createServiceContainer } = require("../core/state/service-container");
const { createApp } = require("../api/app");

async function main() {
  const rootDir = path.resolve(__dirname, "..");
  const config = loadConfig({ rootDir });
  const services = await createServiceContainer(config);
  const app = createApp({ config, services });

  const server = app.listen(config.app.port, config.app.host, () => {
    services.logger.info("api_started", {
      host: config.app.host,
      port: config.app.port
    });
  });

  async function shutdown(signal) {
    services.logger.info("shutdown_requested", { signal });
    await services.mqttService.stop();
    await new Promise((resolve) => server.close(resolve));
    process.exit(0);
  }

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
