const { buildEnvelope, validateEnvelope } = require("../../models/mqtt-message.model");

function createEnvelope(topicKey, source, data, options = {}) {
  return buildEnvelope({
    type: topicKey,
    source,
    correlationId: options.correlationId || "",
    data
  });
}

function validateAutomationEnvelope(envelope) {
  const validation = validateEnvelope(envelope);
  const errors = [...validation.errors];

  if (envelope && envelope.type !== "automation.command") {
    errors.push("invalid_command_type");
  }

  if (!envelope || !envelope.data || typeof envelope.data !== "object") {
    errors.push("missing_command_data");
  } else {
    if (!envelope.data.action) {
      errors.push("missing_action");
    }

    if (!envelope.data.target) {
      errors.push("missing_target");
    }
  }

  return {
    ok: errors.length === 0,
    errors
  };
}

module.exports = {
  createEnvelope,
  validateAutomationEnvelope,
  validateEnvelope
};
