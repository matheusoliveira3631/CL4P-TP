const { createServiceStatus, summarizeServiceStates } = require("../../models/service-status.model");

class StatusAggregator {
  constructor({
    config,
    runtimeState,
    systemStatusService,
    storageService,
    llmService,
    mqttService,
    fileBrowserProvider,
    jellyfinProvider,
    mediaService,
    networkService,
    linksService
  }) {
    this.config = config;
    this.runtimeState = runtimeState;
    this.systemStatusService = systemStatusService;
    this.storageService = storageService;
    this.llmService = llmService;
    this.mqttService = mqttService;
    this.fileBrowserProvider = fileBrowserProvider;
    this.jellyfinProvider = jellyfinProvider;
    this.mediaService = mediaService;
    this.networkService = networkService;
    this.linksService = linksService;
  }

  async getServicesStatus() {
    const [storageStatus, llmHealth, mqttHealth, fileBrowserStatus, jellyfinStatus] = await Promise.all([
      this.storageService.getStatus(),
      this.llmService.getHealth(),
      this.mqttService.getStatuses(),
      this.fileBrowserProvider.getStatus(),
      this.jellyfinProvider.getStatus()
    ]);

    const mediaStatus = await this.mediaService.getStatus({
      fileBrowserStatus,
      jellyfinStatus
    });

    const services = {
      api: createServiceStatus({
        name: "api",
        state: "up",
        details: {
          host: this.config.app.host,
          port: this.config.app.port
        }
      }),
      mqttClient: mqttHealth.client,
      mqttBroker: mqttHealth.broker,
      llm: llmHealth.status,
      storage: storageStatus.service,
      filebrowser: fileBrowserStatus,
      media: mediaStatus.service,
      jellyfin: jellyfinStatus,
      network: this.networkService.getSnapshot().service
    };

    return {
      timestamp: new Date().toISOString(),
      services,
      summary: summarizeServiceStates(services)
    };
  }

  async getStatus() {
    const [system, storage, servicesSnapshot] = await Promise.all([
      Promise.resolve(this.systemStatusService.getMetrics(this.runtimeState.snapshot().startedAt)),
      this.storageService.getStatus(),
      this.getServicesStatus()
    ]);

    const links = this.linksService.build({
      fileBrowserStatus: servicesSnapshot.services.filebrowser,
      jellyfinStatus: servicesSnapshot.services.jellyfin
    });

    return {
      ok: true,
      app: {
        name: this.config.app.name,
        environment: this.config.app.environment,
        version: this.config.app.version
      },
      system,
      network: this.networkService.getSnapshot(),
      storage,
      services: servicesSnapshot,
      links,
      runtime: this.runtimeState.snapshot()
    };
  }
}

module.exports = {
  StatusAggregator
};
