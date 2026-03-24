const crypto = require("crypto");

function buildEnvelope(input = {}) {
  const source = typeof input.source === "string" && input.source.trim() ? input.source.trim() : "internal";
  const type = typeof input.type === "string" && input.type.trim() ? input.type.trim() : "generic.event";
  const data = input.data && typeof input.data === "object" && !Array.isArray(input.data) ? input.data : {};

  return {
    id: input.id || crypto.randomUUID(),
    type,
    source,
    timestamp: input.timestamp || new Date().toISOString(),
    correlationId: input.correlationId || "",
    version: 1,
    data
  };
}

function validateEnvelope(envelope) {
  const errors = [];

  if (!envelope || typeof envelope !== "object" || Array.isArray(envelope)) {
    return {
      valid: false,
      errors: ["invalid_envelope"]
    };
  }

  if (!envelope.id) {
    errors.push("missing_id");
  }

  if (!envelope.type) {
    errors.push("missing_type");
  }

  if (!envelope.source) {
    errors.push("missing_source");
  }

  if (!envelope.timestamp) {
    errors.push("missing_timestamp");
  }

  if (envelope.version !== 1) {
    errors.push("unsupported_version");
  }

  if (!envelope.data || typeof envelope.data !== "object" || Array.isArray(envelope.data)) {
    errors.push("invalid_data");
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

module.exports = {
  buildEnvelope,
  validateEnvelope
};
