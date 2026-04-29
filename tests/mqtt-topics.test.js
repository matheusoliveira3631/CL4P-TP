const test = require("node:test");
const assert = require("node:assert/strict");
const { getAllowedSubscribeTopics, getTopic, isAllowedPublishTopic, listTopics } = require("../services/mqtt/topic-registry");

test("mqtt registry exposes expected topics", () => {
  assert.equal(getTopic("automationCommand"), "cl4ptp/automation/command");
  assert.equal(getTopic("sunmiPrintRequest"), "cl4ptp/sunmi/print/request");
  assert.equal(getTopic("sunmiPrintStatus"), "cl4ptp/sunmi/print/status");
  assert.equal(isAllowedPublishTopic("sunmiPrintRequest"), true);
  assert.equal(getAllowedSubscribeTopics().includes("cl4ptp/sunmi/print/status"), true);
  assert.equal(listTopics().length >= 5, true);
});
