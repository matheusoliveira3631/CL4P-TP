const crypto = require("crypto");
const { listTopics } = require("../../services/mqtt/topic-registry");

function success(res, data) {
  res.json({
    ok: true,
    data
  });
}

function failure(res, statusCode, error, message) {
  res.status(statusCode).json({
    ok: false,
    error,
    message
  });
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readPublishOptions(body) {
  return {
    qos: body.qos === undefined || body.qos === "" ? undefined : Number(body.qos),
    retain: Boolean(body.retain),
    correlationId: body.correlationId || crypto.randomUUID()
  };
}

function createMqttController({ mqttService, runtimeState, logger }) {
  return {
    async status(_req, res) {
      const statuses = await mqttService.getStatuses();
      const runtime = runtimeState.snapshot().mqtt;

      success(res, {
        client: statuses.client,
        broker: statuses.broker,
        runtime
      });
    },

    async topics(_req, res) {
      success(res, {
        topics: listTopics()
      });
    },

    async publish(req, res) {
      const body = req.body || {};
      const topicKey = typeof body.topicKey === "string" ? body.topicKey.trim() : "";
      const payload = body.payload;

      if (!topicKey) {
        failure(res, 400, "topic_key_required", "Informe um topicKey configurado.");
        return;
      }

      if (!isPlainObject(payload)) {
        failure(res, 400, "payload_object_required", "O payload deve ser um objeto JSON.");
        return;
      }

      try {
        const envelope = await mqttService.publishByKey(topicKey, "cl4p-ui", payload, readPublishOptions(body));
        success(res, {
          envelope
        });
      } catch (error) {
        logger.warn("mqtt_ui_publish_failed", {
          error: error.code || error.message,
          topicKey
        });

        const isDisconnected = error.message === "mqtt_client_not_connected";
        failure(
          res,
          isDisconnected ? 503 : 400,
          error.code || error.message,
          isDisconnected ? "Cliente MQTT desconectado." : "Falha ao publicar mensagem MQTT."
        );
      }
    },

    async test(_req, res) {
      try {
        const envelope = await mqttService.publishByKey("automationEvent", "cl4p-ui", {
          status: "test",
          message: "Teste MQTT via CL4P-TP UI"
        }, {
          qos: 0,
          retain: false,
          correlationId: crypto.randomUUID()
        });

        success(res, {
          envelope
        });
      } catch (error) {
        logger.warn("mqtt_ui_test_failed", {
          error: error.code || error.message
        });

        const isDisconnected = error.message === "mqtt_client_not_connected";
        failure(
          res,
          isDisconnected ? 503 : 400,
          error.code || error.message,
          isDisconnected ? "Cliente MQTT desconectado." : "Falha ao enviar teste MQTT."
        );
      }
    }
  };
}

module.exports = {
  createMqttController
};
