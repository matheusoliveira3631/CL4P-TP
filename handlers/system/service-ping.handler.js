const servicePingHandler = {
  id: "service.ping",
  async handle(intent, context) {
    const snapshot = await context.services.statusAggregator.getServicesStatus();
    const serviceName = intent.params.service || "";

    if (!serviceName) {
      return snapshot;
    }

    return {
      service: serviceName,
      status: snapshot.services[serviceName] || null
    };
  }
};

module.exports = {
  servicePingHandler
};
