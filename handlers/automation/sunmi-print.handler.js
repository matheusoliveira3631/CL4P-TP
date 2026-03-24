const sunmiPrintHandler = {
  id: "sunmi.print.request",
  async handle(intent, context) {
    const content = intent.params.content || intent.params.text || intent.rawText;

    if (!content) {
      const error = new Error("print_content_required");
      error.code = "print_content_required";
      throw error;
    }

    return context.services.mqttService.publishByKey("sunmiPrintRequest", context.source, {
      jobType: intent.params.jobType || "text",
      content,
      copies: Number.isFinite(intent.params.copies) ? intent.params.copies : 1,
      meta: {
        origin: "cl4ptp",
        source: context.source
      }
    }, {
      qos: 1,
      retain: false,
      correlationId: context.requestId
    });
  }
};

module.exports = {
  sunmiPrintHandler
};
