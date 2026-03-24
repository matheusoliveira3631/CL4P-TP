function createRequestLoggerMiddleware(logger) {
  return function requestLoggerMiddleware(req, res, next) {
    const startedAt = Date.now();

    res.on("finish", () => {
      logger.info("http_request", {
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        durationMs: Date.now() - startedAt
      });
    });

    next();
  };
}

module.exports = {
  createRequestLoggerMiddleware
};
