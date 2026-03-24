const mqtt = require("mqtt");
const { createServiceStatus } = require("../../models/service-status.model");
const { createEnvelope, validateAutomationEnvelope } = require("./payload-schema");
const { findTopicByName, getAllowedSubscribeTopics, getTopic, getTopicDefinition, isAllowedPublishTopic, listTopics } = require("./topic-registry");
const { EmbeddedBroker } = require("./embedded-broker");

class MqttService {
  constructor({ config, runtimeState, logger }) {
    this.config = config;
    this.runtimeState = runtimeState;
    this.logger = logger;
    this.client = null;
    this.embeddedBroker = null;
    this.onCommand = null;
  }

  async start(onCommand) {
    this.onCommand = onCommand;

    if (this.config.mqtt.embedded.enabled) {
      this.embeddedBroker = new EmbeddedBroker({
        host: this.config.mqtt.embedded.host,
        port: this.config.mqtt.embedded.port,
        runtimeState: this.runtimeState,
        logger: this.logger
      });

      try {
        await this.embeddedBroker.start();
      } catch (error) {
        this.runtimeState.update("mqtt.lastError", error.message);
        this.logger.warn("embedded_broker_start_failed", { error: error.message });
      }
    }

    await this.connectClient();
  }

  connectClient() {
    return new Promise((resolve) => {
      this.client = mqtt.connect(this.config.mqtt.brokerUrl, {
        clientId: this.config.mqtt.clientId,
        username: this.config.mqtt.username || undefined,
        password: this.config.mqtt.password || undefined,
        connectTimeout: this.config.mqtt.connectTimeoutMs,
        reconnectPeriod: this.config.mqtt.reconnectPeriodMs
      });

      let resolved = false;

      this.client.on("connect", async () => {
        this.runtimeState.update("mqtt.clientConnected", true);
        this.runtimeState.update("mqtt.lastError", null);
        this.logger.info("mqtt_client_connected", { url: this.config.mqtt.brokerUrl });

        try {
          await this.subscribeToCommands();
        } catch (error) {
          this.logger.warn("mqtt_subscribe_failed", { error: error.message });
        }

        if (!resolved) {
          resolved = true;
          resolve();
        }
      });

      this.client.on("message", async (topic, payloadBuffer) => {
        await this.handleIncomingMessage(topic, payloadBuffer.toString("utf8"));
      });

      this.client.on("error", (error) => {
        this.runtimeState.update("mqtt.lastError", error.message);
        this.runtimeState.update("mqtt.clientConnected", false);
        this.logger.warn("mqtt_client_error", { error: error.message });
        if (!resolved) {
          resolved = true;
          resolve();
        }
      });

      this.client.on("offline", () => {
        this.runtimeState.update("mqtt.clientConnected", false);
      });

      this.client.on("close", () => {
        this.runtimeState.update("mqtt.clientConnected", false);
      });
    });
  }

  async subscribeToCommands() {
    if (!this.client) {
      return;
    }

    for (const topic of getAllowedSubscribeTopics()) {
      await new Promise((resolve, reject) => {
        this.client.subscribe(topic, { qos: 1 }, (error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    }
  }

  async handleIncomingMessage(topic, rawPayload) {
    this.runtimeState.update("mqtt.lastMessageAt", new Date().toISOString());
    const topicDefinition = findTopicByName(topic);

    if (!topicDefinition) {
      return;
    }

    let payload;

    try {
      payload = JSON.parse(rawPayload);
    } catch (error) {
      await this.publishExecutionEvent("rejected", {
        handler: "mqtt.ingress",
        message: "Invalid JSON payload",
        error: error.message
      });
      return;
    }

    const validation = validateAutomationEnvelope(payload);

    if (!validation.ok) {
      await this.publishExecutionEvent("rejected", {
        handler: "mqtt.ingress",
        message: "Invalid MQTT envelope",
        error: validation.errors.join(",")
      }, payload.id || "");
      return;
    }

    if (typeof this.onCommand === "function") {
      await this.onCommand(payload);
    }
  }

  async publishByKey(topicKey, source, data, options = {}) {
    if (!isAllowedPublishTopic(topicKey)) {
      const error = new Error("topic_not_allowed");
      error.code = "topic_not_allowed";
      throw error;
    }

    const topicDefinition = getTopicDefinition(topicKey);
    const topic = getTopic(topicKey);
    const envelope = createEnvelope(topicDefinition.type, source, data, options);
    await this.publishRaw(topic, envelope, {
      qos: options.qos !== undefined ? options.qos : topicDefinition.qos,
      retain: options.retain !== undefined ? options.retain : topicDefinition.retain
    });
    return envelope;
  }

  async publishExecutionEvent(status, data, correlationId = "") {
    try {
      return await this.publishByKey("automationEvent", "executor", {
        status,
        ...data
      }, {
        correlationId,
        qos: 0,
        retain: false
      });
    } catch (error) {
      this.logger.warn("mqtt_event_publish_failed", { error: error.message });
      return null;
    }
  }

  publishRaw(topic, payload, publishOptions = {}) {
    return new Promise((resolve, reject) => {
      if (!this.client || !this.runtimeState.snapshot().mqtt.clientConnected) {
        reject(new Error("mqtt_client_not_connected"));
        return;
      }

      this.client.publish(topic, JSON.stringify(payload), publishOptions, (error) => {
        if (error) {
          reject(error);
          return;
        }

        this.runtimeState.update("mqtt.lastPublishedAt", new Date().toISOString());
        resolve(payload);
      });
    });
  }

  async getStatuses() {
    const runtime = this.runtimeState.snapshot().mqtt;

    return {
      client: createServiceStatus({
        name: "mqttClient",
        state: runtime.clientConnected ? "up" : runtime.lastError ? "degraded" : "down",
        details: {
          brokerUrl: this.config.mqtt.brokerUrl,
          lastError: runtime.lastError || "",
          lastMessageAt: runtime.lastMessageAt || "",
          lastPublishedAt: runtime.lastPublishedAt || "",
          subscribedTopics: getAllowedSubscribeTopics()
        },
        error: runtime.lastError || ""
      }),
      broker: createServiceStatus({
        name: "mqttBroker",
        state: this.config.mqtt.embedded.enabled
          ? runtime.brokerRunning
            ? "up"
            : "degraded"
          : "disabled",
        details: {
          host: this.config.mqtt.embedded.host,
          port: this.config.mqtt.embedded.port,
          topics: listTopics()
        },
        error: runtime.lastError || ""
      })
    };
  }

  async stop() {
    if (this.client) {
      await new Promise((resolve) => this.client.end(true, resolve));
    }

    if (this.embeddedBroker) {
      await this.embeddedBroker.stop();
    }
  }
}

module.exports = {
  MqttService
};
