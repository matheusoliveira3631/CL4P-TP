function createAutomationController({ mqttService }) {
  return {
    async publish(req, res) {
      const topicKey = req.body && typeof req.body.topicKey === "string" ? req.body.topicKey : "";
      const payload = req.body ? req.body.payload : null;

      if (!topicKey || !payload || typeof payload !== "object" || Array.isArray(payload)) {
        res.status(400).json({
          ok: false,
          error: "invalid_publish_request"
        });
        return;
      }

      try {
        const envelope = await mqttService.publishByKey(topicKey, "api", payload, {
          qos: req.body.qos,
          retain: req.body.retain,
          correlationId: req.get("x-request-id") || ""
        });

        res.json({
          ok: true,
          envelope
        });
      } catch (error) {
        res.status(400).json({
          ok: false,
          error: error.code || error.message
        });
      }
    }
  };
}

module.exports = {
  createAutomationController
};
