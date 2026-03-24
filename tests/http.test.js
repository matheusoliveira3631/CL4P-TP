const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("http");
const os = require("os");
const fs = require("fs/promises");
const path = require("path");
const { loadConfig } = require("../config");
const { createServiceContainer } = require("../core/state/service-container");
const { createApp } = require("../api/app");

async function createServer() {
  const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), "cl4ptp-http-"));
  await fs.mkdir(path.join(rootDir, "public", "status"), { recursive: true });
  await fs.writeFile(path.join(rootDir, "public", "status", "index.html"), "<!doctype html><title>test</title>");

  const config = loadConfig({
    rootDir,
    env: {
      ...process.env,
      CL4PTP_HOST: "127.0.0.1",
      CL4PTP_PORT: "0",
      CL4PTP_API_TOKEN: "test-token",
      CL4PTP_MQTT_EMBEDDED_ENABLED: "false",
      CL4PTP_MQTT_BROKER_URL: "mqtt://127.0.0.1:65530"
    }
  });

  const services = await createServiceContainer(config);
  const app = createApp({ config, services });
  const server = http.createServer(app);

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();

  return {
    services,
    server,
    baseUrl: `http://127.0.0.1:${address.port}`
  };
}

test("health endpoint responds", async (t) => {
  const runtime = await createServer();

  t.after(async () => {
    await runtime.services.mqttService.stop();
    await new Promise((resolve) => runtime.server.close(resolve));
  });

  const response = await fetch(`${runtime.baseUrl}/health`);
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.ok, true);
});

test("status and media endpoints respond", async (t) => {
  const runtime = await createServer();

  t.after(async () => {
    await runtime.services.mqttService.stop();
    await new Promise((resolve) => runtime.server.close(resolve));
  });

  const statusResponse = await fetch(`${runtime.baseUrl}/status`);
  const statusPayload = await statusResponse.json();
  const mediaResponse = await fetch(`${runtime.baseUrl}/media/library`);
  const mediaPayload = await mediaResponse.json();

  assert.equal(statusResponse.status, 200);
  assert.equal(statusPayload.ok, true);
  assert.equal(mediaResponse.status, 200);
  assert.equal(mediaPayload.ok, true);
});

test("mutable endpoints require token", async (t) => {
  const runtime = await createServer();

  t.after(async () => {
    await runtime.services.mqttService.stop();
    await new Promise((resolve) => runtime.server.close(resolve));
  });

  const response = await fetch(`${runtime.baseUrl}/intent/parse`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      text: "oi"
    })
  });

  assert.equal(response.status, 401);
});

test("intent parse works with token", async (t) => {
  const runtime = await createServer();

  t.after(async () => {
    await runtime.services.mqttService.stop();
    await new Promise((resolve) => runtime.server.close(resolve));
  });

  const response = await fetch(`${runtime.baseUrl}/intent/parse`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-cl4ptp-token": "test-token"
    },
    body: JSON.stringify({
      text: "imprimir teste"
    })
  });
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.ok, true);
  assert.equal(payload.intent.type, "automation");
});

test("command and automation publish endpoints enforce runtime constraints", async (t) => {
  const runtime = await createServer();

  t.after(async () => {
    await runtime.services.mqttService.stop();
    await new Promise((resolve) => runtime.server.close(resolve));
  });

  const commandResponse = await fetch(`${runtime.baseUrl}/command`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-cl4ptp-token": "test-token"
    },
    body: JSON.stringify({
      text: "imprimir teste"
    })
  });
  const commandPayload = await commandResponse.json();

  const publishResponse = await fetch(`${runtime.baseUrl}/automation/publish`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-cl4ptp-token": "test-token"
    },
    body: JSON.stringify({
      topicKey: "automationEvent",
      payload: {
        message: "hello"
      }
    })
  });
  const publishPayload = await publishResponse.json();

  assert.equal(commandResponse.status, 200);
  assert.equal(commandPayload.ok, true);
  assert.equal(commandPayload.execution.handler, "sunmi.print.request");
  assert.equal(publishResponse.status, 400);
  assert.equal(publishPayload.ok, false);
});

test("media endpoints reject non-media roots and malformed encoded paths", async (t) => {
  const runtime = await createServer();

  t.after(async () => {
    await runtime.services.mqttService.stop();
    await new Promise((resolve) => runtime.server.close(resolve));
  });

  const invalidRootResponse = await fetch(`${runtime.baseUrl}/media/library?root=repo_data`);
  const invalidRootPayload = await invalidRootResponse.json();

  const malformedPathResponse = await new Promise((resolve, reject) => {
    const request = http.request(`${runtime.baseUrl}/media/stream/repo_media/%ZZ`, resolve);
    request.on("error", reject);
    request.end();
  });
  const malformedBody = await new Promise((resolve) => {
    let body = "";
    malformedPathResponse.on("data", (chunk) => {
      body += chunk.toString();
    });
    malformedPathResponse.on("end", () => resolve(body));
  });

  assert.equal(invalidRootResponse.status, 400);
  assert.equal(invalidRootPayload.ok, false);
  assert.equal(malformedPathResponse.statusCode, 400);
  assert.match(malformedBody, /invalid_encoded_path/);
});
