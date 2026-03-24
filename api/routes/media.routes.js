const express = require("express");
const { createMediaController } = require("../controllers/media.controller");

function wrap(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function createMediaRoutes(deps) {
  const router = express.Router();
  const controller = createMediaController(deps);

  router.get("/library", wrap(controller.library));
  router.get("/stream/:root/*", wrap(controller.stream));

  return router;
}

module.exports = {
  createMediaRoutes
};
