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

function badge(state) {
  return `<span class="badge ${state}">${state}</span>`;
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}`);
  }
  return response.json();
}

function renderSystem(status) {
  const metrics = document.getElementById("system-metrics");
  metrics.innerHTML = `
    <dt>Host Uptime</dt><dd>${status.system.host.uptimeSec}s</dd>
    <dt>Process Uptime</dt><dd>${status.system.process.uptimeSec}s</dd>
    <dt>Free RAM</dt><dd>${formatBytes(status.system.memory.freeBytes)}</dd>
    <dt>Total RAM</dt><dd>${formatBytes(status.system.memory.totalBytes)}</dd>
    <dt>Node</dt><dd>${status.system.runtime.node}</dd>
  `;
}

function renderServices(snapshot) {
  const container = document.getElementById("services");
  container.innerHTML = Object.entries(snapshot.services)
    .map(([name, service]) => `
      <div class="service">
        <div>
          <strong>${name}</strong>
          <div>${service.error || ""}</div>
        </div>
        ${badge(service.state)}
      </div>
    `)
    .join("");
}

function renderStorage(status) {
  const container = document.getElementById("storage");
  container.innerHTML = Object.values(status.storage.roots)
    .map((root) => `
      <div class="service">
        <div>
          <strong>${root.root}</strong>
          <div>${root.path || "not configured"}</div>
        </div>
        <div>${root.available ? formatBytes(root.freeBytes) : root.error || "unavailable"}</div>
      </div>
    `)
    .join("");
}

function renderLinks(status) {
  const list = document.getElementById("links");
  list.innerHTML = Object.entries(status.links)
    .filter(([, value]) => Boolean(value))
    .map(([label, value]) => `<li><a href="${value}" target="_blank" rel="noreferrer">${label}</a></li>`)
    .join("");
}

async function renderMedia() {
  const media = await fetchJson("/media/library");
  const container = document.getElementById("media");
  const roots = media.library.roots || {};
  container.innerHTML = Object.entries(roots)
    .map(([root, data]) => `
      <div class="service">
        <div>
          <strong>${root}</strong>
          <div>${data.path || "/"}</div>
        </div>
        <div>${Array.isArray(data.files) ? data.files.length : 0} entries</div>
      </div>
    `)
    .join("");
}

async function refresh() {
  const status = await fetchJson("/status");
  document.getElementById("summary").textContent = `API on ${status.network.bind.host}:${status.network.bind.port}`;
  document.getElementById("last-updated").textContent = `Last updated: ${new Date().toLocaleString()}`;
  renderSystem(status);
  renderServices(status.services);
  renderStorage(status);
  renderLinks(status);
  await renderMedia();
}

refresh().catch((error) => {
  document.getElementById("summary").textContent = error.message;
});

setInterval(() => {
  refresh().catch(() => {});
}, 15000);
