const mqttPublishHandler = {
  id: "mqtt.publish",
  async handle(intent, context) {
    const topicKey = intent.params.topicKey;
    const payload = intent.params.payload;

    if (!topicKey) {
      const error = new Error("topic_key_required");
      error.code = "topic_key_required";
      throw error;
    }

    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      const error = new Error("payload_object_required");
      error.code = "payload_object_required";
      throw error;
    }

    return context.services.mqttService.publishByKey(topicKey, context.source, payload, {
      qos: intent.params.qos,
      retain: intent.params.retain,
      correlationId: context.requestId
    });
  }
};

module.exports = {
  mqttPublishHandler
};
