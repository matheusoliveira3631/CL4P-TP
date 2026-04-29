const express = require("express");
const { createSystemController } = require("../controllers/system.controller");

function wrap(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function createSystemRoutes(deps) {
  const router = express.Router();
  const controller = createSystemController(deps);

  router.get("/status", wrap(controller.status));

  return router;
}

module.exports = {
  createSystemRoutes
};
