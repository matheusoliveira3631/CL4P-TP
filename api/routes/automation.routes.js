const express = require("express");
const { createAutomationController } = require("../controllers/automation.controller");

function wrap(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function createAutomationRoutes(deps) {
  const router = express.Router();
  const controller = createAutomationController(deps);

  router.post("/publish", wrap(controller.publish));

  return router;
}

module.exports = {
  createAutomationRoutes
};
