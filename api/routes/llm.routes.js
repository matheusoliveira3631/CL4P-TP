const express = require("express");
const { createLlmController } = require("../controllers/llm.controller");

function wrap(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function createLlmRoutes(deps) {
  const router = express.Router();
  const controller = createLlmController(deps);

  router.get("/health", wrap(controller.health));

  return router;
}

module.exports = {
  createLlmRoutes
};
