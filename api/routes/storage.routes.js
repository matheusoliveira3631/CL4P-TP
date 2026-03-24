const express = require("express");
const { createStatusController } = require("../controllers/status.controller");

function wrap(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function createStorageRoutes(deps) {
  const router = express.Router();
  const controller = createStatusController(deps);

  router.get("/status", wrap(controller.storageStatus));

  return router;
}

module.exports = {
  createStorageRoutes
};
