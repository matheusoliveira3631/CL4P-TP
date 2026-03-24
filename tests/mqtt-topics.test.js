const test = require("node:test");
const assert = require("node:assert/strict");
const { getTopic, isAllowedPublishTopic, listTopics } = require("../services/mqtt/topic-registry");

test("mqtt registry exposes expected topics", () => {
  assert.equal(getTopic("automationCommand"), "cl4ptp/automation/command");
  assert.equal(isAllowedPublishTopic("sunmiPrintRequest"), true);
  assert.equal(listTopics().length >= 5, true);
});
