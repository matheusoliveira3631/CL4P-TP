const express = require("express");
const path = require("path");
const { createNotesController } = require("../controllers/notes.controller");

function wrap(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function createNotesRoutes(deps) {
  const router = express.Router();
  const controller = createNotesController(deps);

  router.get("/list", wrap(controller.list));
  router.post("/", wrap(controller.create));
  router.post("/:id/reprint", wrap(controller.reprint));
  router.use("/images", express.static(path.join(deps.config.paths.notesImagesDir)));

  return router;
}

module.exports = {
  createNotesRoutes
};
