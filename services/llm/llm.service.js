const { createServiceStatus } = require("../../models/service-status.model");
const { buildUnknownIntent } = require("../../models/intent.model");
const { normalizeInput } = require("./intent-normalizer");
const { validateIntentResult } = require("./intent-validator");

class LlmService {
  constructor({ config, adapters }) {
    this.config = config;
    this.adapters = adapters;
  }

  getAdapter() {
    return this.adapters[this.config.llm.provider] || this.adapters.mock;
  }

  async parseText(text, context = {}) {
    const normalized = normalizeInput(text, context, this.config);
    const adapter = this.getAdapter();

    if (normalized.errors.length > 0) {
      return buildUnknownIntent(
        {
          rawText: normalized.rawText,
          normalizedText: normalized.normalizedText,
          source: adapter.getName()
        },
        normalized.errors
      );
    }

    try {
      const rawIntent = await adapter.parse(normalized, normalized.context);
      const validation = validateIntentResult(rawIntent, {
        rawText: normalized.rawText,
        normalizedText: normalized.normalizedText,
        source: adapter.getName()
      });

      return validation.valid
        ? validation.intent
        : buildUnknownIntent(
            {
              rawText: normalized.rawText,
              normalizedText: normalized.normalizedText,
              source: adapter.getName()
            },
            validation.errors.length ? validation.errors : ["invalid_schema"]
          );
    } catch (error) {
      return buildUnknownIntent(
        {
          rawText: normalized.rawText,
          normalizedText: normalized.normalizedText,
          source: adapter.getName()
        },
        [error.code || error.message || "adapter_failure"]
      );
    }
  }

  async getHealth() {
    const adapter = this.getAdapter();
    const health = await adapter.health().catch((error) => ({
      available: false,
      detail: error.code || error.message || "health_failed"
    }));

    return {
      provider: adapter.getName(),
      configuredProvider: this.config.llm.provider,
      status: createServiceStatus({
        name: "llm",
        state: health.available || adapter.getName() === "mock" ? "up" : "degraded",
        details: {
          provider: adapter.getName(),
          detail: health.detail || ""
        },
        error: health.available ? "" : health.detail || ""
      })
    };
  }
}

module.exports = {
  LlmService
};
