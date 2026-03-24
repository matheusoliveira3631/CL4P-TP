const { validateCommandRequest } = require("../../models/command.model");

function createCommandController({ commandRouter }) {
  return {
    async execute(req, res) {
      const validation = validateCommandRequest(req.body);

      if (!validation.ok) {
        res.status(400).json({
          ok: false,
          error: validation.error
        });
        return;
      }

      const result = await commandRouter.handleRequest(validation.value, {
        source: "api",
        requestId: req.get("x-request-id") || ""
      });

      res.json({
        ok: true,
        intent: result.intent,
        execution: result.execution
      });
    }
  };
}

module.exports = {
  createCommandController
};
