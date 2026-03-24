const express = require("express");
const path = require("path");
const { createHealthRoutes } = require("./routes/health.routes");
const { createStatusRoutes } = require("./routes/status.routes");
const { createServicesRoutes } = require("./routes/services.routes");
const { createStorageRoutes } = require("./routes/storage.routes");
const { createLlmRoutes } = require("./routes/llm.routes");
const { createIntentRoutes } = require("./routes/intent.routes");
const { createCommandRoutes } = require("./routes/command.routes");
const { createAutomationRoutes } = require("./routes/automation.routes");
const { createMediaRoutes } = require("./routes/media.routes");
const { createAuthMiddleware } = require("./middlewares/auth.middleware");
const { createRateLimitMiddleware } = require("./middlewares/rate-limit.middleware");
const { createRequestLoggerMiddleware } = require("./middlewares/request-logger.middleware");
const { errorMiddleware } = require("./middlewares/error.middleware");

function createApp({ config, services }) {
  const app = express();
  const deps = {
    config,
    ...services
  };

  app.disable("x-powered-by");
  app.use(express.json({ limit: config.security.bodyLimit }));
  app.use(createRequestLoggerMiddleware(services.logger));
  app.use(createRateLimitMiddleware(config));
  app.use(createAuthMiddleware(config));

  app.get("/", (_req, res) => {
    res.redirect("/status-page/");
  });

  app.use("/status-page", express.static(path.join(config.paths.statusPageDir)));
  app.use("/health", createHealthRoutes(deps));
  app.use("/status", createStatusRoutes(deps));
  app.use("/services", createServicesRoutes(deps));
  app.use("/storage", createStorageRoutes(deps));
  app.use("/llm", createLlmRoutes(deps));
  app.use("/intent", createIntentRoutes(deps));
  app.use("/command", createCommandRoutes(deps));
  app.use("/automation", createAutomationRoutes(deps));
  app.use("/media", createMediaRoutes(deps));

  app.use(errorMiddleware(services.logger, config.app.environment));

  return app;
}

module.exports = {
  createApp
};
