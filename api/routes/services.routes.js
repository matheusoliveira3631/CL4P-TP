const express = require("express");
const { createStatusController } = require("../controllers/status.controller");

function wrap(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function createServicesRoutes(deps) {
  const router = express.Router();
  const controller = createStatusController(deps);

  router.get("/status", wrap(controller.servicesStatus));

  return router;
}

module.exports = {
  createServicesRoutes
};
