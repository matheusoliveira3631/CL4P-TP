import { apiGet } from "../api.js";

function stateLabel(value) {
  return value ? "online" : "offline";
}

function card(title, value, state = "") {
  return `
    <div class="card">
      <div class="card-title">${title}</div>
      <div class="card-value ${state}">${value}</div>
    </div>
  `;
}

export async function renderDashboardModule(root) {
  root.innerHTML = `
    <section class="panel">
      <h2>Dashboard</h2>
      <p class="muted">Carregando status local...</p>
    </section>
  `;

  const [system, mqtt] = await Promise.all([
    apiGet("/api/system/status"),
    apiGet("/api/mqtt/status")
  ]);

  const modules = system.data.modules;
  const sunmi = mqtt.data.sunmi || { state: "down", lastStatus: null };
  const lastSunmi = sunmi.lastStatus;

  root.innerHTML = `
    <div class="grid">
      ${card("API", "online", "connected")}
      ${card("Broker CL4P", modules.mqtt.broker || "unknown", modules.mqtt.broker)}
      ${card("Cliente API MQTT", stateLabel(modules.mqtt.connected), modules.mqtt.connected ? "connected" : "down")}
      ${card("Sunmi APK", sunmi.state === "up" ? lastSunmi?.data?.status || "online" : "offline", sunmi.state === "up" ? "connected" : "down")}
      ${card("LLM", "em breve")}
      ${card("Automations", modules.automation.enabled ? "base ativa" : "em breve")}
    </div>
  `;
}
