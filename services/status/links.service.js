class LinksService {
  constructor({ config, networkService }) {
    this.config = config;
    this.networkService = networkService;
  }

  build({ fileBrowserStatus, jellyfinStatus }) {
    const baseUrl = this.networkService.getBaseUrls()[0] || `http://127.0.0.1:${this.config.app.port}`;
    const links = {
      api: baseUrl,
      statusPage: `${baseUrl}/status-page/`,
      health: `${baseUrl}/health`,
      services: `${baseUrl}/services/status`,
      storage: `${baseUrl}/storage/status`,
      llm: `${baseUrl}/llm/health`,
      mediaLibrary: `${baseUrl}/media/library`
    };

    if (fileBrowserStatus.state !== "disabled") {
      links.fileBrowser = this.config.fileBrowser.url;
    }

    if (jellyfinStatus.state !== "disabled") {
      links.jellyfin = this.config.jellyfin.url;
    }

    return links;
  }
}

module.exports = {
  LinksService
};
