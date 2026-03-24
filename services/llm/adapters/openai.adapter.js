class OpenAiIntentAdapter {
  getName() {
    return "openai";
  }

  async health() {
    return {
      available: false,
      detail: "future_adapter"
    };
  }

  async parse() {
    const error = new Error("openai_adapter_not_available_in_mvp");
    error.code = "openai_adapter_not_available_in_mvp";
    throw error;
  }
}

module.exports = {
  OpenAiIntentAdapter
};
