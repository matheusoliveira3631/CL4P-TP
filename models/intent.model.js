const INTENT_TYPES = ["automation", "conversation", "offline_query", "unknown"];

function sanitizeString(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
}

function normalizePlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return { ...value };
}

function clampConfidence(value) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 0;
  }

  if (value < 0) {
    return 0;
  }

  if (value > 1) {
    return 1;
  }

  return Number(value.toFixed(3));
}

function coerceIntentShape(candidate = {}, meta = {}) {
  const rawText = sanitizeString(meta.rawText || candidate.rawText || "");
  const normalizedText = sanitizeString(meta.normalizedText || candidate.normalizedText || rawText);

  return {
    type: sanitizeString(candidate.type).toLowerCase() || "unknown",
    action: sanitizeString(candidate.action),
    target: sanitizeString(candidate.target),
    location: sanitizeString(candidate.location),
    params: normalizePlainObject(candidate.params),
    confidence: clampConfidence(candidate.confidence),
    rawText,
    normalizedText,
    source: sanitizeString(meta.source || candidate.source || "unknown"),
    valid: Boolean(candidate.valid),
    errors: Array.isArray(candidate.errors)
      ? candidate.errors.map((item) => sanitizeString(String(item))).filter(Boolean)
      : []
  };
}

function buildUnknownIntent(meta = {}, errors = []) {
  return {
    type: "unknown",
    action: "",
    target: "",
    location: "",
    params: {},
    confidence: 0,
    rawText: sanitizeString(meta.rawText || ""),
    normalizedText: sanitizeString(meta.normalizedText || meta.rawText || ""),
    source: sanitizeString(meta.source || "unknown"),
    valid: false,
    errors: errors.map((item) => sanitizeString(String(item))).filter(Boolean)
  };
}

function validateIntent(intent) {
  const candidate = coerceIntentShape(intent, intent);
  const errors = [...candidate.errors];

  if (!INTENT_TYPES.includes(candidate.type)) {
    errors.push("invalid_type");
  }

  if (!candidate.source) {
    errors.push("missing_source");
  }

  if (candidate.type === "automation") {
    if (!candidate.action) {
      errors.push("missing_action");
    }

    if (!candidate.target) {
      errors.push("missing_target");
    }
  }

  const valid = errors.length === 0 && candidate.type !== "unknown";

  return {
    valid,
    errors,
    intent: {
      ...candidate,
      valid,
      errors
    }
  };
}

function buildIntentKey(intent) {
  return `${sanitizeString(intent.action).toLowerCase()}:${sanitizeString(intent.target).toLowerCase()}`;
}

module.exports = {
  INTENT_TYPES,
  buildIntentKey,
  buildUnknownIntent,
  createUnknownIntent: buildUnknownIntent,
  clampConfidence,
  coerceIntentShape,
  normalizePlainObject,
  sanitizeString,
  validateIntent
};
