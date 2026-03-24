const { sanitizeString } = require("../../models/intent.model");
const { normalizeContext } = require("../../models/command.model");

function normalizeInput(text, context = {}, config = { llm: { inputMaxLength: 512 } }) {
  const rawText = sanitizeString(text);
  const normalizedText = sanitizeString(rawText.toLowerCase());
  const errors = [];

  if (!rawText) {
    errors.push("empty_text");
  }

  if (rawText.length > config.llm.inputMaxLength) {
    errors.push("input_too_long");
  }

  return {
    rawText,
    normalizedText,
    context: normalizeContext(context),
    errors
  };
}

module.exports = {
  normalizeInput
};
