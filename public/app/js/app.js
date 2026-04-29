import { renderDashboardModule } from "./modules/dashboard.module.js";
import { renderMqttModule } from "./modules/mqtt.module.js";
import { renderLlmModule } from "./modules/llm.module.js";
import { renderAutomationModule } from "./modules/automation.module.js";
import { renderStorageModule } from "./modules/storage.module.js";
import { renderSettingsModule } from "./modules/settings.module.js";

const modules = {
  dashboard: {
    title: "Dashboard",
    subtitle: "Visão local dos módulos CL4P-TP.",
    render: renderDashboardModule
  },
  mqtt: {
    title: "MQTT",
    subtitle: "Operação local de tópicos e publicação MQTT.",
    render: renderMqttModule
  },
  llm: {
    title: "LLM",
    subtitle: "Scaffold para provedores locais e fallback.",
    render: renderLlmModule
  },
  automation: {
    title: "Automations",
    subtitle: "Scaffold para comandos e automações.",
    render: renderAutomationModule
  },
  storage: {
    title: "Storage",
    subtitle: "Scaffold para armazenamento e histórico.",
    render: renderStorageModule
  },
  settings: {
    title: "Settings",
    subtitle: "Configurações locais da UI.",
    render: renderSettingsModule
  }
};

const root = document.getElementById("app-root");
const title = document.getElementById("page-title");
const subtitle = document.getElementById("page-subtitle");

async function navigate(moduleKey) {
  const module = modules[moduleKey] || modules.dashboard;

  document.querySelectorAll(".nav-item").forEach((button) => {
    button.classList.toggle("active", button.dataset.module === moduleKey);
  });

  title.textContent = module.title;
  subtitle.textContent = module.subtitle;
  root.innerHTML = `
    <section class="panel">
      <p class="muted">Carregando...</p>
    </section>
  `;

  try {
    await module.render(root);
  } catch (error) {
    root.innerHTML = `
      <section class="panel">
        <h2>Falha ao carregar módulo</h2>
        <pre class="log">${error.message}</pre>
      </section>
    `;
  }
}

document.querySelectorAll(".nav-item").forEach((button) => {
  button.addEventListener("click", () => {
    const moduleKey = button.dataset.module;
    window.location.hash = moduleKey;
    navigate(moduleKey);
  });
});

window.addEventListener("hashchange", () => {
  navigate(window.location.hash.replace("#", "") || "dashboard");
});

navigate(window.location.hash.replace("#", "") || "dashboard");
