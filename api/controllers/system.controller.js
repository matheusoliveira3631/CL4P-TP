function createSystemController({ config, statusAggregator }) {
  return {
    async status(_req, res) {
      const servicesSnapshot = await statusAggregator.getServicesStatus();
      const mqttClient = servicesSnapshot.services.mqttClient;
      const mqttBroker = servicesSnapshot.services.mqttBroker;
      const llm = servicesSnapshot.services.llm;

      res.json({
        ok: true,
        data: {
          service: config.app.name,
          version: config.app.version,
          environment: config.app.environment,
          modules: {
            mqtt: {
              enabled: mqttClient.state !== "disabled",
              connected: mqttClient.state === "up",
              broker: mqttBroker.state
            },
            llm: {
              enabled: llm.state === "up",
              state: llm.state
            },
            automation: {
              enabled: true
            }
          }
        }
      });
    }
  };
}

module.exports = {
  createSystemController
};
