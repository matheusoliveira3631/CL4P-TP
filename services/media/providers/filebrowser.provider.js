const fs = require("fs");
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

class FileBrowserProvider {
  constructor(config) {
    this.config = config;
  }

  async getStatus() {
    if (!this.config.fileBrowser.enabled) {
      return createServiceStatus({
        name: "filebrowser",
        state: "disabled",
        details: {
          url: this.config.fileBrowser.url
        }
      });
    }

    const binaryExists = this.config.fileBrowser.binaryPath
      ? await fs.promises.access(this.config.fileBrowser.binaryPath).then(() => true).catch(() => false)
      : false;
    const reachable = this.config.fileBrowser.url
      ? await probeUrl(this.config.fileBrowser.url, this.config.network.probeTimeoutMs)
      : false;

    return createServiceStatus({
      name: "filebrowser",
      state: reachable ? "up" : binaryExists || this.config.fileBrowser.url ? "degraded" : "down",
      details: {
        url: this.config.fileBrowser.url,
        binaryPath: this.config.fileBrowser.binaryPath,
        rootPath: this.config.fileBrowser.rootPath,
        binaryExists,
        reachable
      },
      error: reachable ? "" : "filebrowser_unreachable"
    });
  }
}

module.exports = {
  FileBrowserProvider
};
