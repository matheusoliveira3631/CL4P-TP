const os = require("os");
const { createServiceStatus } = require("../../models/service-status.model");

class NetworkService {
  constructor(config) {
    this.config = config;
  }

  getLanAddresses() {
    const interfaces = os.networkInterfaces();
    const addresses = [];

    Object.entries(interfaces).forEach(([name, entries]) => {
      (entries || []).forEach((entry) => {
        if (entry.family === "IPv4" && !entry.internal) {
          addresses.push({
            name,
            address: entry.address
          });
        }
      });
    });

    return addresses;
  }

  getBaseUrls() {
    const urls = new Set([`http://127.0.0.1:${this.config.app.port}`]);

    if (this.config.app.host !== "0.0.0.0" && this.config.app.host !== "::") {
      urls.add(`http://${this.config.app.host}:${this.config.app.port}`);
      return Array.from(urls);
    }

    this.getLanAddresses().forEach((entry) => {
      urls.add(`http://${entry.address}:${this.config.app.port}`);
    });

    return Array.from(urls);
  }

  getSnapshot() {
    return {
      hostname: os.hostname(),
      bind: {
        host: this.config.app.host,
        port: this.config.app.port
      },
      addresses: this.getLanAddresses(),
      baseUrls: this.getBaseUrls(),
      service: createServiceStatus({
        name: "network",
        state: "up",
        details: {
          bindHost: this.config.app.host,
          port: this.config.app.port
        }
      })
    };
  }
}

module.exports = {
  NetworkService
};
