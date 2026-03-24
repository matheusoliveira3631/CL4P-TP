const express = require("express");
const { createCommandController } = require("../controllers/command.controller");

function wrap(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function createCommandRoutes(deps) {
  const router = express.Router();
  const controller = createCommandController(deps);

  router.post("/", wrap(controller.execute));

  return router;
}

module.exports = {
  createCommandRoutes
};
