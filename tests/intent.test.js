const test = require("node:test");
const assert = require("node:assert/strict");
const { loadConfig } = require("../config");
const { MockIntentAdapter } = require("../services/llm/adapters/mock.adapter");
const { LlmService } = require("../services/llm/llm.service");
const { LlamaCppAdapter } = require("../services/llm/adapters/llamacpp.adapter");
const { OpenAiIntentAdapter } = require("../services/llm/adapters/openai.adapter");

function createLlmService() {
  const config = loadConfig({
    rootDir: process.cwd(),
    env: {
      ...process.env,
      CL4PTP_LLM_PROVIDER: "mock"
    }
  });

  return new LlmService({
    config,
    adapters: {
      mock: new MockIntentAdapter(),
      llamacpp: new LlamaCppAdapter(config),
      openai: new OpenAiIntentAdapter()
    }
  });
}

test("mock parser returns automation intent for print requests", async () => {
  const llmService = createLlmService();
  const intent = await llmService.parseText("imprimir pedido 123");

  assert.equal(intent.type, "automation");
  assert.equal(intent.action, "request_print");
  assert.equal(intent.target, "sunmi");
  assert.equal(intent.valid, true);
});

test("mock parser falls back to unknown for empty input", async () => {
  const llmService = createLlmService();
  const intent = await llmService.parseText("");

  assert.equal(intent.type, "unknown");
  assert.equal(intent.valid, false);
});
