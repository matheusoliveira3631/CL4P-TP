function createStatusController({ statusAggregator, storageService }) {
  return {
    async status(_req, res) {
      res.json(await statusAggregator.getStatus());
    },
    async servicesStatus(_req, res) {
      res.json({
        ok: true,
        services: await statusAggregator.getServicesStatus()
      });
    },
    async storageStatus(_req, res) {
      res.json({
        ok: true,
        storage: await storageService.getStatus()
      });
    }
  };
}

module.exports = {
  createStatusController
};
