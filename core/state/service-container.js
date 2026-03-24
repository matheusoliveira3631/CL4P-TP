const { createLogger } = require("../../services/status/logger");
const { createRuntimeState } = require("../../services/status/runtime-state");
const { StorageService } = require("../../services/storage/storage.service");
const { NetworkService } = require("../../services/network/network.service");
const { SystemStatusService } = require("../../services/status/system-status.service");
const { LinksService } = require("../../services/status/links.service");
const { FileBrowserProvider } = require("../../services/media/providers/filebrowser.provider");
const { JellyfinProvider } = require("../../services/media/providers/jellyfin.provider");
const { MediaService } = require("../../services/media/media.service");
const { MockIntentAdapter } = require("../../services/llm/adapters/mock.adapter");
const { LlamaCppAdapter } = require("../../services/llm/adapters/llamacpp.adapter");
const { OpenAiIntentAdapter } = require("../../services/llm/adapters/openai.adapter");
const { LlmService } = require("../../services/llm/llm.service");
const { MqttService } = require("../../services/mqtt/mqtt.service");
const { createHandlerRegistry } = require("../executor/handler-registry");
const { AutomationExecutor } = require("../executor/automation-executor");
const { CommandRouter } = require("../router/command-router");
const { StatusAggregator } = require("./status-aggregator");
const { automationEnvelopeToIntent } = require("../../models/command.model");
const { echoHandler } = require("../../handlers/automation/echo.handler");
const { mqttPublishHandler } = require("../../handlers/automation/mqtt-publish.handler");
const { sunmiPrintHandler } = require("../../handlers/automation/sunmi-print.handler");
const { statusRefreshHandler } = require("../../handlers/system/status-refresh.handler");
const { storageScanHandler } = require("../../handlers/system/storage-scan.handler");
const { servicePingHandler } = require("../../handlers/system/service-ping.handler");

async function createServiceContainer(config) {
  const runtimeState = createRuntimeState();
  const logger = createLogger(config.app.logLevel);
  const storageService = new StorageService(config);
  const networkService = new NetworkService(config);
  const systemStatusService = new SystemStatusService();
  const fileBrowserProvider = new FileBrowserProvider(config);
  const jellyfinProvider = new JellyfinProvider(config);
  const mediaService = new MediaService({ storageService, runtimeState });
  const llmService = new LlmService({
    config,
    adapters: {
      mock: new MockIntentAdapter(),
      llamacpp: new LlamaCppAdapter(config),
      openai: new OpenAiIntentAdapter()
    }
  });
  const mqttService = new MqttService({ config, runtimeState, logger });
  const linksService = new LinksService({ config, networkService });

  const statusAggregator = new StatusAggregator({
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
  });

  const services = {
    logger,
    runtimeState,
    storageService,
    networkService,
    systemStatusService,
    fileBrowserProvider,
    jellyfinProvider,
    mediaService,
    llmService,
    mqttService,
    statusAggregator
  };

  const registry = createHandlerRegistry();
  registry.register("echo", "automation", echoHandler.id, echoHandler.handle);
  registry.register("publish", "mqtt", mqttPublishHandler.id, mqttPublishHandler.handle);
  registry.register("request_print", "sunmi", sunmiPrintHandler.id, sunmiPrintHandler.handle);
  registry.register("refresh", "status", statusRefreshHandler.id, statusRefreshHandler.handle);
  registry.register("scan", "storage", storageScanHandler.id, storageScanHandler.handle);
  registry.register("ping", "service", servicePingHandler.id, servicePingHandler.handle);

  const executor = new AutomationExecutor({
    registry,
    services,
    mqttService,
    runtimeState,
    logger
  });

  const commandRouter = new CommandRouter({
    llmService,
    executor
  });

  services.executor = executor;
  services.commandRouter = commandRouter;

  await storageService.ensureRepoDirectories();
  await storageService.scanRoots();

  await mqttService.start(async (envelope) => {
    const intent = automationEnvelopeToIntent(envelope);
    await executor.executeIntent(intent, {
      source: "mqtt",
      requestId: envelope.id || ""
    });
  });

  return services;
}

module.exports = {
  createServiceContainer
};
