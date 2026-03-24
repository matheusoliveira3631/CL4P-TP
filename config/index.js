const fs = require("fs");
const path = require("path");
const { createPaths } = require("./paths");

function readBoolean(value, defaultValue) {
  if (value === undefined || value === null || value === "") {
    return defaultValue;
  }

  const normalized = String(value).trim().toLowerCase();
  return ["1", "true", "yes", "on"].includes(normalized);
}

function readInteger(value, defaultValue) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : defaultValue;
}

function readList(value, fallback = []) {
  if (!value) {
    return fallback;
  }

  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function loadEnvFile(rootDir, baseEnv) {
  const envFilePath = path.join(rootDir, ".env");

  if (!fs.existsSync(envFilePath)) {
    return { ...baseEnv };
  }

  const mergedEnv = { ...baseEnv };
  const content = fs.readFileSync(envFilePath, "utf8");

  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      return;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex === -1) {
      return;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, "");

    if (key && mergedEnv[key] === undefined) {
      mergedEnv[key] = value;
    }
  });

  return mergedEnv;
}

function loadConfig(options = {}) {
  const rootDir = options.rootDir || process.cwd();
  const env = loadEnvFile(rootDir, options.env || process.env);
  const paths = createPaths(rootDir, env);

  const embeddedBrokerHost = env.CL4PTP_MQTT_EMBEDDED_HOST || "127.0.0.1";
  const embeddedBrokerPort = readInteger(env.CL4PTP_MQTT_EMBEDDED_PORT, 1883);

  return {
    app: {
      name: "CL4P-TP",
      version: "0.1.0",
      environment: env.NODE_ENV || "development",
      host: env.CL4PTP_HOST || "0.0.0.0",
      port: readInteger(env.CL4PTP_PORT, 3000),
      logLevel: env.CL4PTP_LOG_LEVEL || "info"
    },
    security: {
      apiToken: env.CL4PTP_API_TOKEN || "changeme-cl4ptp",
      bodyLimit: env.CL4PTP_BODY_LIMIT || "64kb",
      rateLimitWindowMs: readInteger(env.CL4PTP_RATE_LIMIT_WINDOW_MS, 60000),
      rateLimitMax: readInteger(env.CL4PTP_RATE_LIMIT_MAX, 30)
    },
    llm: {
      provider: env.CL4PTP_LLM_PROVIDER || "mock",
      timeoutMs: readInteger(env.CL4PTP_LLM_TIMEOUT_MS, 15000),
      inputMaxLength: readInteger(env.CL4PTP_LLM_INPUT_MAX_LENGTH, 512),
      llama: {
        binaryPath: env.CL4PTP_LLAMA_BINARY || "",
        modelPath: env.CL4PTP_LLAMA_MODEL || "",
        args: readList(env.CL4PTP_LLAMA_ARGS)
      }
    },
    mqtt: {
      clientId: env.CL4PTP_MQTT_CLIENT_ID || "cl4ptp-api",
      brokerUrl: env.CL4PTP_MQTT_BROKER_URL || `mqtt://${embeddedBrokerHost}:${embeddedBrokerPort}`,
      username: env.CL4PTP_MQTT_USERNAME || "",
      password: env.CL4PTP_MQTT_PASSWORD || "",
      connectTimeoutMs: readInteger(env.CL4PTP_MQTT_CONNECT_TIMEOUT_MS, 5000),
      reconnectPeriodMs: readInteger(env.CL4PTP_MQTT_RECONNECT_PERIOD_MS, 3000),
      embedded: {
        enabled: readBoolean(env.CL4PTP_MQTT_EMBEDDED_ENABLED, true),
        host: embeddedBrokerHost,
        port: embeddedBrokerPort
      }
    },
    media: {
      scanLimit: readInteger(env.CL4PTP_MEDIA_SCAN_LIMIT, 200),
      scanDepth: readInteger(env.CL4PTP_MEDIA_SCAN_DEPTH, 4),
      allowedExtensions: {
        image: [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".heic"],
        video: [".mp4", ".mkv", ".webm", ".mov", ".m4v", ".avi"],
        audio: [".mp3", ".aac", ".ogg", ".wav", ".flac", ".m4a"]
      }
    },
    fileBrowser: {
      enabled: readBoolean(env.CL4PTP_FILEBROWSER_ENABLED, false),
      url: env.CL4PTP_FILEBROWSER_URL || "http://127.0.0.1:8080",
      binaryPath: env.CL4PTP_FILEBROWSER_BINARY || "",
      rootPath: env.CL4PTP_FILEBROWSER_ROOT || "",
      port: readInteger(env.CL4PTP_FILEBROWSER_PORT, 8080)
    },
    jellyfin: {
      enabled: readBoolean(env.CL4PTP_JELLYFIN_ENABLED, false),
      url: env.CL4PTP_JELLYFIN_URL || "http://127.0.0.1:8096"
    },
    network: {
      probeTimeoutMs: readInteger(env.CL4PTP_PROBE_TIMEOUT_MS, 2000)
    },
    paths
  };
}

module.exports = {
  loadConfig,
  loadEnvFile,
  readBoolean,
  readInteger,
  readList
};
