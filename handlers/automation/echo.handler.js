const echoHandler = {
  id: "automation.echo",
  async handle(intent) {
    return {
      echoedAt: new Date().toISOString(),
      message: intent.params.message || intent.rawText || "echo",
      params: intent.params
    };
  }
};

module.exports = {
  echoHandler
};
