const storageScanHandler = {
  id: "storage.scan",
  async handle(_intent, context) {
    return context.services.storageService.scanRoots();
  }
};

module.exports = {
  storageScanHandler
};
