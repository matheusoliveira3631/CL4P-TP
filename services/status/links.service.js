function reachableUrl(configuredUrl, lanHost, fallbackPort) {
  try {
    const parsed = new URL(configuredUrl);
    const port = parsed.port || fallbackPort;
    return `http://${lanHost}:${port}`;
  } catch (error) {
    return `http://${lanHost}:${fallbackPort}`;
  }
}

class LinksService {
  constructor({ config, networkService }) {
    this.config = config;
    this.networkService = networkService;
  }

  build({ fileBrowserStatus, jellyfinStatus }) {
    const baseUrl = this.networkService.getBaseUrls()[0] || `http://127.0.0.1:${this.config.app.port}`;
    const lanHost = new URL(baseUrl).hostname;

    const links = {
      api: baseUrl,
      statusPage: `${baseUrl}/status-page/`,
      health: `${baseUrl}/health`,
      services: `${baseUrl}/services/status`,
      storage: `${baseUrl}/storage/status`,
      llm: `${baseUrl}/llm/health`,
      mediaLibrary: `${baseUrl}/media/library`
    };

    // The FileBrowser/Jellyfin URLs in config default to 127.0.0.1, which
    // only resolves on the device itself. Keep the configured port but
    // point the host at the same LAN address used for every other link,
    // so the hub's links work from any device on the network.
    if (fileBrowserStatus.state !== "disabled") {
      links.fileBrowser = reachableUrl(this.config.fileBrowser.url, lanHost, this.config.fileBrowser.port);
    }

    if (jellyfinStatus.state !== "disabled") {
      links.jellyfin = reachableUrl(this.config.jellyfin.url, lanHost, 8096);
    }

    return links;
  }
}

module.exports = {
  LinksService
};
