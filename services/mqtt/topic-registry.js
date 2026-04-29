const TOPICS = {
  automationCommand: {
    key: "automationCommand",
    topic: "cl4ptp/automation/command",
    type: "automation.command",
    qos: 1,
    retain: false,
    subscribe: true
  },
  automationEvent: {
    key: "automationEvent",
    topic: "cl4ptp/automation/event",
    type: "automation.event",
    qos: 0,
    retain: false,
    subscribe: false
  },
  sunmiPrintRequest: {
    key: "sunmiPrintRequest",
    topic: "cl4ptp/sunmi/print/request",
    type: "sunmi.print.request",
    qos: 1,
    retain: false,
    subscribe: false
  },
  sunmiPrintStatus: {
    key: "sunmiPrintStatus",
    topic: "cl4ptp/sunmi/print/status",
    type: "sunmi.print.status",
    qos: 0,
    retain: false,
    subscribe: true
  },
  systemStatus: {
    key: "systemStatus",
    topic: "cl4ptp/system/status",
    type: "system.status",
    qos: 0,
    retain: true,
    subscribe: false
  }
};

function getTopic(topicKey) {
  return TOPICS[topicKey] ? TOPICS[topicKey].topic : "";
}

function getTopicDefinition(topicKey) {
  return TOPICS[topicKey] || null;
}

function getAllowedSubscribeTopics() {
  return Object.values(TOPICS)
    .filter((entry) => entry.subscribe)
    .map((entry) => entry.topic);
}

function isAllowedPublishTopic(topicKey) {
  return Boolean(TOPICS[topicKey]);
}

function findTopicByName(topic) {
  return Object.values(TOPICS).find((entry) => entry.topic === topic) || null;
}

function listTopics() {
  return Object.values(TOPICS);
}

module.exports = {
  findTopicByName,
  getAllowedSubscribeTopics,
  getTopic,
  getTopicDefinition,
  isAllowedPublishTopic,
  listTopics
};
