function createHealthController({ config }) {
  return {
    health(_req, res) {
      res.json({
        ok: true,
        service: "api",
        version: config.app.version,
        host: config.app.host,
        port: config.app.port,
        timestamp: new Date().toISOString()
      });
    }
  };
}

module.exports = {
  createHealthController
};
