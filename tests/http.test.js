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
  await fs.mkdir(path.join(rootDir, "public", "app"), { recursive: true });
  await fs.mkdir(path.join(rootDir, "public", "status"), { recursive: true });
  await fs.writeFile(path.join(rootDir, "public", "app", "index.html"), "<!doctype html><title>app</title>");
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

test("root serves local app and legacy status page remains available", async (t) => {
  const runtime = await createServer();

  t.after(async () => {
    await runtime.services.mqttService.stop();
    await new Promise((resolve) => runtime.server.close(resolve));
  });

  const appResponse = await fetch(`${runtime.baseUrl}/`);
  const appHtml = await appResponse.text();
  const legacyResponse = await fetch(`${runtime.baseUrl}/status-page/`);
  const legacyHtml = await legacyResponse.text();

  assert.equal(appResponse.status, 200);
  assert.match(appHtml, /<title>app<\/title>/);
  assert.equal(legacyResponse.status, 200);
  assert.match(legacyHtml, /<title>test<\/title>/);
});

test("api system and mqtt status endpoints respond", async (t) => {
  const runtime = await createServer();

  t.after(async () => {
    await runtime.services.mqttService.stop();
    await new Promise((resolve) => runtime.server.close(resolve));
  });

  const systemResponse = await fetch(`${runtime.baseUrl}/api/system/status`);
  const systemPayload = await systemResponse.json();
  const mqttResponse = await fetch(`${runtime.baseUrl}/api/mqtt/status`);
  const mqttPayload = await mqttResponse.json();
  const topicsResponse = await fetch(`${runtime.baseUrl}/api/mqtt/topics`);
  const topicsPayload = await topicsResponse.json();

  assert.equal(systemResponse.status, 200);
  assert.equal(systemPayload.ok, true);
  assert.equal(systemPayload.data.service, "CL4P-TP");
  assert.equal(mqttResponse.status, 200);
  assert.equal(mqttPayload.ok, true);
  assert.equal(mqttPayload.data.client.name, "mqttClient");
  assert.equal(mqttPayload.data.runtime.lastSunmiStatus, null);
  assert.equal(topicsResponse.status, 200);
  assert.equal(topicsPayload.ok, true);
  assert.equal(Array.isArray(topicsPayload.data.topics), true);
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

test("api mqtt publish requires token", async (t) => {
  const runtime = await createServer();

  t.after(async () => {
    await runtime.services.mqttService.stop();
    await new Promise((resolve) => runtime.server.close(resolve));
  });

  const response = await fetch(`${runtime.baseUrl}/api/mqtt/publish`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      topicKey: "automationEvent",
      payload: {
        message: "hello"
      }
    })
  });

  assert.equal(response.status, 401);
});

test("api mqtt publish rejects invalid body", async (t) => {
  const runtime = await createServer();

  t.after(async () => {
    await runtime.services.mqttService.stop();
    await new Promise((resolve) => runtime.server.close(resolve));
  });

  const response = await fetch(`${runtime.baseUrl}/api/mqtt/publish`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-cl4ptp-token": "test-token"
    },
    body: JSON.stringify({
      topicKey: "",
      payload: "invalid"
    })
  });
  const payload = await response.json();

  assert.equal(response.status, 400);
  assert.equal(payload.ok, false);
  assert.equal(payload.error, "topic_key_required");
});

test("api mqtt publish accepts image payload shape before runtime publish", async (t) => {
  const runtime = await createServer();

  t.after(async () => {
    await runtime.services.mqttService.stop();
    await new Promise((resolve) => runtime.server.close(resolve));
  });

  const response = await fetch(`${runtime.baseUrl}/api/mqtt/publish`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-cl4ptp-token": "test-token"
    },
    body: JSON.stringify({
      topicKey: "sunmiPrintRequest",
      payload: {
        content: "imagem",
        image: {
          mime: "image/png",
          base64: "iVBORw0KGgo=",
          placement: "header"
        }
      }
    })
  });
  const payload = await response.json();

  assert.equal(response.status, 503);
  assert.equal(payload.ok, false);
  assert.equal(payload.error, "mqtt_client_not_connected");
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
