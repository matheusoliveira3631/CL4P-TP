function buildImagePayload(image) {
  if (!image || typeof image !== "object" || !image.base64) {
    return null;
  }

  return {
    base64: image.base64,
    mime: image.mime || "image/jpeg",
    mode: image.mode || "photo"
  };
}

const sunmiPrintHandler = {
  id: "sunmi.print.request",
  async handle(intent, context) {
    const content = intent.params.content || intent.params.text || intent.rawText || "";
    const image = buildImagePayload(intent.params.image);

    if (!content && !image) {
      const error = new Error("print_content_required");
      error.code = "print_content_required";
      throw error;
    }

    return context.services.mqttService.publishByKey("sunmiPrintRequest", context.source, {
      jobType: intent.params.jobType || (image ? "image" : "text"),
      content,
      image,
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
