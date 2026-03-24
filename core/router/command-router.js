const { buildUnknownIntent } = require("../../models/intent.model");
const { normalizeCommandInput, normalizeDirectIntent } = require("../../models/command.model");

class CommandRouter {
  constructor({ llmService, executor }) {
    this.llmService = llmService;
    this.executor = executor;
  }

  async handleRequest(payload, context = {}) {
    const normalized = normalizeCommandInput(payload);

    if (normalized.errors.length > 0) {
      return {
        ok: false,
        errors: normalized.errors
      };
    }

    const intent = normalized.hasText
      ? await this.llmService.parseText(normalized.text, normalized.context)
      : normalized.hasIntent
        ? normalizeDirectIntent(normalized.intent, normalized.context)
        : buildUnknownIntent(
            {
              rawText: "",
              normalizedText: "",
              source: context.source || "api"
            },
            ["missing_command_input"]
          );

    const execution = await this.executor.executeIntent(intent, {
      source: context.source || normalized.context.source || "api",
      requestId: context.requestId || ""
    });

    return {
      ok: true,
      intent,
      execution
    };
  }
}

module.exports = {
  CommandRouter
};
