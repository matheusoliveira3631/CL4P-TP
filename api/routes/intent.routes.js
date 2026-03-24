const express = require("express");
const { createLlmController } = require("../controllers/llm.controller");

function wrap(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function createIntentRoutes(deps) {
  const router = express.Router();
  const controller = createLlmController(deps);

  router.post("/parse", wrap(controller.parse));

  return router;
}

module.exports = {
  createIntentRoutes
};
