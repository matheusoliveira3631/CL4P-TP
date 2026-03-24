const express = require("express");
const { createStatusController } = require("../controllers/status.controller");

function wrap(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function createStatusRoutes(deps) {
  const router = express.Router();
  const controller = createStatusController(deps);

  router.get("/", wrap(controller.status));

  return router;
}

module.exports = {
  createStatusRoutes
};
