const express = require("express");
const { createMqttController } = require("../controllers/mqtt.controller");

function wrap(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function createMqttRoutes(deps) {
  const router = express.Router();
  const controller = createMqttController(deps);

  router.get("/status", wrap(controller.status));
  router.get("/topics", wrap(controller.topics));
  router.post("/publish", wrap(controller.publish));
  router.post("/test", wrap(controller.test));

  return router;
}

module.exports = {
  createMqttRoutes
};
