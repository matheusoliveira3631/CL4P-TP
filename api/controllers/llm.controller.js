function createLlmController({ llmService }) {
  return {
    async health(_req, res) {
      res.json({
        ok: true,
        llm: await llmService.getHealth()
      });
    },
    async parse(req, res) {
      if (!req.body || typeof req.body.text !== "string") {
        res.status(400).json({
          ok: false,
          error: "text_required"
        });
        return;
      }

      const intent = await llmService.parseText(req.body.text, req.body.context || {});
      res.json({
        ok: true,
        intent
      });
    }
  };
}

module.exports = {
  createLlmController
};
