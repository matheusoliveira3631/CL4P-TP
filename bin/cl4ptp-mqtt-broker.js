const path = require("path");
const { loadConfig } = require("../config");
const { createRuntimeState } = require("../services/status/runtime-state");
const { createLogger } = require("../services/status/logger");
const { EmbeddedBroker } = require("../services/mqtt/embedded-broker");

async function main() {
  const rootDir = path.resolve(__dirname, "..");
  const config = loadConfig({ rootDir });
  const runtimeState = createRuntimeState();
  const logger = createLogger(config.app.logLevel);
  const broker = new EmbeddedBroker({
    host: config.mqtt.embedded.host,
    port: config.mqtt.embedded.port,
    runtimeState,
    logger
  });

  await broker.start();
  logger.info("standalone_mqtt_broker_started", {
    host: config.mqtt.embedded.host,
    port: config.mqtt.embedded.port
  });

  async function shutdown(signal) {
    logger.info("standalone_mqtt_broker_shutdown", { signal });
    await broker.stop();
    process.exit(0);
  }

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
