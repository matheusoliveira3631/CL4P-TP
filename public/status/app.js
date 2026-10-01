function formatBytes(value) {
  if (!value && value !== 0) {
    return "-";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  let current = value;
  let unit = 0;

  while (current >= 1024 && unit < units.length - 1) {
    current /= 1024;
    unit += 1;
  }

  return `${current.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}`);
  }
  return response.json();
}

function stat(label, value) {
  return `
    <div class="stat">
      <span class="stat-label">${label}</span>
      <span class="stat-value">${value}</span>
    </div>
  `;
}

function formatUptime(totalSeconds) {
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (days > 0) {
    return `${days}d ${hours}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function renderSystem(status) {
  const container = document.getElementById("system-metrics");
  container.innerHTML = [
    stat("Uptime do host", formatUptime(status.system.host.uptimeSec)),
    stat("Uptime do processo", formatUptime(status.system.process.uptimeSec)),
    stat("RAM livre", formatBytes(status.system.memory.freeBytes)),
    stat("RAM total", formatBytes(status.system.memory.totalBytes)),
    stat("Node", status.system.runtime.node)
  ].join("");
}

const STORAGE_ROOT_LABELS = {
  repo_media: "Mídia",
  repo_data: "Dados",
  internal_shared: "Armazenamento interno",
  external_otg: "HD externo (OTG)"
};

function renderStorage(status) {
  const container = document.getElementById("storage");
  const roots = Object.values(status.storage.roots).filter((root) => root.configured);

  if (!roots.length) {
    container.innerHTML = '<p class="hint">Nenhum root de armazenamento configurado.</p>';
    return;
  }

  container.innerHTML = roots
    .map((root) => {
      const label = STORAGE_ROOT_LABELS[root.root] || root.root;

      if (!root.available || root.totalBytes === null) {
        return `
          <div class="storage-root">
            <div class="storage-root-head">
              <span class="storage-root-name">${label}</span>
            </div>
            <div class="storage-root-unavailable">${root.error || "indisponível"}</div>
          </div>
        `;
      }

      const usedPct = Math.min(100, Math.round((root.usedBytes / root.totalBytes) * 100));
      const warn = usedPct >= 85;

      return `
        <div class="storage-root">
          <div class="storage-root-head">
            <span class="storage-root-name">${label}</span>
            <span class="storage-root-free">${formatBytes(root.freeBytes)} livres de ${formatBytes(root.totalBytes)}</span>
          </div>
          <div class="storage-bar">
            <div class="storage-bar-fill ${warn ? "warn" : ""}" style="width: ${usedPct}%"></div>
          </div>
        </div>
      `;
    })
    .join("");
}

const SERVICE_LABELS = {
  api: "API",
  mqttClient: "MQTT (cliente)",
  mqttBroker: "MQTT (broker embutido)",
  filebrowser: "FileBrowser",
  jellyfin: "Jellyfin",
  network: "Rede"
};

function renderServices(snapshot) {
  const container = document.getElementById("services");
  container.innerHTML = Object.entries(snapshot.services)
    .map(([key, service]) => `
      <div class="service-row">
        <span class="status-dot ${service.state}"></span>
        <span class="service-name">${SERVICE_LABELS[key] || key}</span>
        <span class="service-detail">${service.error || ""}</span>
      </div>
    `)
    .join("");
}

async function refresh() {
  const status = await fetchJson("/status");
  document.getElementById("summary").textContent = `online em ${status.network.bind.host}:${status.network.bind.port}`;
  document.getElementById("last-updated").textContent = `atualizado às ${new Date().toLocaleTimeString()}`;
  renderSystem(status);
  renderStorage(status);
  renderServices(status.services);
}

refresh().catch((error) => {
  document.getElementById("summary").textContent = error.message;
});

setInterval(() => {
  refresh().catch(() => {});
}, 15000);
