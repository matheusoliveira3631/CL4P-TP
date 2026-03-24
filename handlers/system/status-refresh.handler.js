const statusRefreshHandler = {
  id: "status.refresh",
  async handle(_intent, context) {
    await context.services.storageService.scanRoots();
    return context.services.statusAggregator.getStatus();
  }
};

module.exports = {
  statusRefreshHandler
};
