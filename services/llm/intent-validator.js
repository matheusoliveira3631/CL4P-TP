const { coerceIntentShape, validateIntent } = require("../../models/intent.model");

function validateIntentResult(intent, meta = {}) {
  const coerced = coerceIntentShape(intent, meta);
  return validateIntent(coerced);
}

module.exports = {
  validateIntentResult
};
