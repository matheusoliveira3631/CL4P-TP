const net = require("net");
const aedesFactory = require("aedes");

class EmbeddedBroker {
  constructor({ host, port, runtimeState, logger }) {
    this.host = host;
    this.port = port;
    this.runtimeState = runtimeState;
    this.logger = logger;
    this.aedes = null;
    this.server = null;
  }

  async start() {
    if (this.server) {
      return;
    }

    this.aedes = aedesFactory();
    this.server = net.createServer(this.aedes.handle);

    await new Promise((resolve, reject) => {
      this.server.once("error", reject);
      this.server.listen(this.port, this.host, resolve);
    });

    this.runtimeState.update("mqtt.brokerRunning", true);
    this.logger.info("embedded_mqtt_broker_started", {
      host: this.host,
      port: this.port
    });
  }

  async stop() {
    if (!this.server) {
      return;
    }

    await new Promise((resolve) => this.server.close(resolve));
    await new Promise((resolve) => this.aedes.close(() => resolve()));

    this.server = null;
    this.aedes = null;
    this.runtimeState.update("mqtt.brokerRunning", false);
  }
}

module.exports = {
  EmbeddedBroker
};
