const path = require("path");
const { loadConfig } = require("../config");

async function main() {
  const rootDir = path.resolve(__dirname, "..");
  const config = loadConfig({ rootDir });
  const baseUrl = `http://127.0.0.1:${config.app.port}`;

  try {
    const response = await fetch(`${baseUrl}/status`);
    const payload = await response.json();
    console.log(JSON.stringify(payload, null, 2));
    return;
  } catch (_error) {
    console.log(
      JSON.stringify(
        {
          ok: false,
          message: "API not reachable, printing static config summary instead.",
          app: config.app,
          mqtt: config.mqtt,
          llm: {
            provider: config.llm.provider,
            llamaModel: config.llm.llama.modelPath || null
          },
          roots: config.paths.storage
        },
        null,
        2
      )
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
