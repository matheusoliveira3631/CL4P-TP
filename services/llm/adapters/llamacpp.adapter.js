const fs = require("fs");
const { spawn } = require("child_process");

class LlamaCppAdapter {
  constructor(config) {
    this.config = config.llm;
  }

  getName() {
    return "llamacpp";
  }

  async health() {
    const binaryPath = this.config.llama.binaryPath;
    const modelPath = this.config.llama.modelPath;

    if (!binaryPath || !modelPath) {
      return {
        available: false,
        detail: "llama_not_configured"
      };
    }

    const binaryExists = await fs.promises.access(binaryPath).then(() => true).catch(() => false);
    const modelExists = await fs.promises.access(modelPath).then(() => true).catch(() => false);

    return {
      available: binaryExists && modelExists,
      detail: binaryExists && modelExists ? "configured" : "llama_missing_files"
    };
  }

  buildPrompt(text) {
    return [
      "Return only valid JSON.",
      'Schema: {"type":"automation|conversation|offline_query|unknown","action":"","target":"","location":"","params":{}}',
      `Input: ${text}`
    ].join("\n");
  }

  async parse(input) {
    const health = await this.health();

    if (!health.available) {
      const error = new Error(health.detail || "llama_unavailable");
      error.code = health.detail || "llama_unavailable";
      throw error;
    }

    const args = [
      "-m",
      this.config.llama.modelPath,
      "-p",
      this.buildPrompt(input.rawText || input.normalizedText),
      "-n",
      "128",
      "--temp",
      "0.1",
      ...this.config.llama.args
    ];

    return new Promise((resolve, reject) => {
      const child = spawn(this.config.llama.binaryPath, args, {
        stdio: ["ignore", "pipe", "pipe"]
      });

      let stdout = "";
      let stderr = "";

      const timeout = setTimeout(() => {
        child.kill("SIGTERM");
        const error = new Error("llama_timeout");
        error.code = "llama_timeout";
        reject(error);
      }, this.config.timeoutMs);

      child.stdout.on("data", (chunk) => {
        stdout += chunk.toString();
      });

      child.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });

      child.on("error", (error) => {
        clearTimeout(timeout);
        reject(error);
      });

      child.on("close", (code) => {
        clearTimeout(timeout);

        if (code !== 0) {
          const error = new Error(stderr || `llama_exit_${code}`);
          error.code = `llama_exit_${code}`;
          reject(error);
          return;
        }

        const match = stdout.match(/\{[\s\S]*\}/);

        if (!match) {
          const error = new Error("llama_invalid_output");
          error.code = "llama_invalid_output";
          reject(error);
          return;
        }

        try {
          resolve(JSON.parse(match[0]));
        } catch (_parseError) {
          const error = new Error("llama_invalid_json");
          error.code = "llama_invalid_json";
          reject(error);
        }
      });
    });
  }
}

module.exports = {
  LlamaCppAdapter
};
