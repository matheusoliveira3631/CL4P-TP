const { createServiceStatus } = require("../../../models/service-status.model");

async function probeUrl(url, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal
    });
    clearTimeout(timeout);
    return response.ok;
  } catch (_error) {
    clearTimeout(timeout);
    return false;
  }
}

class JellyfinProvider {
  constructor(config) {
    this.config = config;
  }

  async getStatus() {
    if (!this.config.jellyfin.enabled) {
      return createServiceStatus({
        name: "jellyfin",
        state: "disabled",
        details: {
          url: this.config.jellyfin.url,
          experimental: true
        }
      });
    }

    const reachable = await probeUrl(this.config.jellyfin.url, this.config.network.probeTimeoutMs);

    return createServiceStatus({
      name: "jellyfin",
      state: reachable ? "up" : "degraded",
      details: {
        url: this.config.jellyfin.url,
        experimental: true,
        reachable
      },
      error: reachable ? "" : "jellyfin_unreachable"
    });
  }
}

module.exports = {
  JellyfinProvider
};
