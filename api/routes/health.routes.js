const express = require("express");
const { createHealthController } = require("../controllers/health.controller");

function createHealthRoutes(deps) {
  const router = express.Router();
  const controller = createHealthController(deps);

  router.get("/", controller.health);

  return router;
}

module.exports = {
  createHealthRoutes
};
