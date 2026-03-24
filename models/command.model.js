const { buildUnknownIntent, coerceIntentShape, sanitizeString, validateIntent } = require("./intent.model");

function normalizeContext(input = {}) {
  return {
    source: sanitizeString(input.source || "api") || "api",
    locale: sanitizeString(input.locale || "pt-BR") || "pt-BR",
    timestamp: sanitizeString(input.timestamp || new Date().toISOString()) || new Date().toISOString(),
    deviceId: sanitizeString(input.deviceId || ""),
    sessionId: sanitizeString(input.sessionId || "")
  };
}

function normalizeCommandInput(payload = {}) {
  const text = sanitizeString(payload.text || "");
  const hasText = Boolean(text);
  const hasIntent = payload.intent && typeof payload.intent === "object" && !Array.isArray(payload.intent);
  const errors = [];

  if ((hasText && hasIntent) || (!hasText && !hasIntent)) {
    errors.push("provide_text_or_intent");
  }

  return {
    text,
    hasText,
    hasIntent,
    intent: hasIntent ? payload.intent : null,
    context: normalizeContext(payload.context || {}),
    errors
  };
}

function validateCommandRequest(payload = {}) {
  const normalized = normalizeCommandInput(payload);

  if (normalized.errors.length > 0) {
    return {
      ok: false,
      error: normalized.errors.join(",")
    };
  }

  return {
    ok: true,
    value: {
      text: normalized.text,
      intent: normalized.intent,
      context: normalized.context
    }
  };
}

function normalizeDirectIntent(intentPayload, fallbackContext = {}) {
  const meta = {
    rawText: sanitizeString(intentPayload && intentPayload.rawText ? intentPayload.rawText : ""),
    normalizedText: sanitizeString(intentPayload && intentPayload.normalizedText ? intentPayload.normalizedText : ""),
    source: sanitizeString(intentPayload && intentPayload.source ? intentPayload.source : fallbackContext.source || "api")
  };

  const coerced = coerceIntentShape(intentPayload, meta);
  const validation = validateIntent(coerced);

  return validation.valid
    ? validation.intent
    : buildUnknownIntent(meta, validation.errors.length ? validation.errors : ["invalid_intent_payload"]);
}

function automationEnvelopeToIntent(envelope) {
  const data = envelope && envelope.data ? envelope.data : {};
  const meta = {
    rawText: "",
    normalizedText: "",
    source: envelope && envelope.source ? envelope.source : "mqtt"
  };

  const validation = validateIntent(
    coerceIntentShape(
      {
        type: "automation",
        action: sanitizeString(data.action),
        target: sanitizeString(data.target),
        location: sanitizeString(data.location),
        params: data.params
      },
      meta
    )
  );

  return validation.valid
    ? validation.intent
    : buildUnknownIntent(meta, validation.errors.length ? validation.errors : ["invalid_automation_command"]);
}

module.exports = {
  automationEnvelopeToIntent,
  normalizeCommandInput,
  normalizeContext,
  normalizeDirectIntent,
  validateCommandRequest
};
