import { apiGet, apiPost } from "../api.js";

let topics = [];
let selectedImage = null;
let selectedImageFile = null;
let imageRotation = 0;
let statusRefreshTimer = null;
let canPublish = false;

const maxImageWidth = 384;
const minImageWidth = 96;
const maxImageBase64Bytes = 220 * 1024;
const jpegQualities = [0.82, 0.72, 0.62, 0.52, 0.42];

function formatJson(value) {
  return JSON.stringify(value, null, 2);
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function padDatePart(value) {
  return String(value).padStart(2, "0");
}

function buildDefaultPayload() {
  const now = new Date();
  const day = padDatePart(now.getDate());
  const month = padDatePart(now.getMonth() + 1);
  const year = now.getFullYear();
  const hours = padDatePart(now.getHours());
  const minutes = padDatePart(now.getMinutes());

  return {
    content: `Pirambeira ${day}/${month}/${year} ${hours}:${minutes}`,
    copies: 1
  };
}

function findSelectedTopic(root) {
  const topicKey = root.querySelector("#mqtt-topic-key").value;
  return topics.find((topic) => topic.key === topicKey) || null;
}

function writeLog(root, title, payload) {
  const log = root.querySelector("#mqtt-log");
  log.textContent = `${title}\n${formatJson(payload)}`;
}

function showSuccessModal(root, message) {
  const modal = root.querySelector("#mqtt-success-modal");
  const messageNode = root.querySelector("#mqtt-success-message");

  if (!modal || !messageNode) {
    return;
  }

  messageNode.textContent = message;
  modal.hidden = false;
  window.clearTimeout(showSuccessModal.timeoutId);
  showSuccessModal.timeoutId = window.setTimeout(() => {
    modal.hidden = true;
  }, 2600);
}

function stopStatusRefresh() {
  if (statusRefreshTimer) {
    window.clearInterval(statusRefreshTimer);
    statusRefreshTimer = null;
  }
}

function readableError(error) {
  const payload = error.payload || { message: error.message };
  if (payload.error === "invalid_api_token") {
    return {
      ...payload,
      message: "Token invalido. Abra Settings e salve o valor de CL4PTP_API_TOKEN da sua .env. Se nao houver .env, o default do projeto e changeme-cl4ptp."
    };
  }
  return payload;
}

function readImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Falha ao ler imagem."));
    reader.readAsDataURL(file);
  });
}

function describeImageSource(file) {
  if (!file) {
    return "imagem";
  }

  return /^image\/jpe?g$/i.test(file.type) ? "foto/imagem" : "imagem";
}

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Arquivo de imagem invalido."));
    image.src = dataUrl;
  });
}

function normalizeImageRotation(value) {
  return Number(value) === 90 ? 90 : 0;
}

function drawImageToCanvas(context, image, width, height, rotation) {
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);

  if (rotation === 90) {
    context.save();
    context.translate(width, 0);
    context.rotate(Math.PI / 2);
    context.drawImage(image, 0, 0, height, width);
    context.restore();
    return;
  }

  context.drawImage(image, 0, 0, width, height);
}

async function prepareImagePayload(file, rotation = 0) {
  if (!file) {
    return null;
  }

  if (!/^image\/(png|jpeg|jpg|webp)$/i.test(file.type)) {
    throw new Error("Use PNG, JPG, JPEG ou WEBP.");
  }

  const dataUrl = await readImageFile(file);
  const image = await loadImage(dataUrl);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  const normalizedRotation = normalizeImageRotation(rotation);
  const orientedWidth = normalizedRotation === 90 ? image.height : image.width;
  const orientedHeight = normalizedRotation === 90 ? image.width : image.height;

  let targetWidth = Math.min(maxImageWidth, orientedWidth);
  let bestCandidate = null;

  while (targetWidth >= minImageWidth) {
    const scale = targetWidth / orientedWidth;
    const width = Math.max(1, Math.round(orientedWidth * scale));
    const height = Math.max(1, Math.round(orientedHeight * scale));

    canvas.width = width;
    canvas.height = height;
    drawImageToCanvas(context, image, width, height, normalizedRotation);

    for (const quality of jpegQualities) {
      const resizedDataUrl = canvas.toDataURL("image/jpeg", quality);
      const base64 = resizedDataUrl.split(",")[1] || "";
      const candidate = {
        mime: "image/jpeg",
        base64,
        placement: "header",
        mode: document.querySelector("#mqtt-image-mode")?.value || "photo",
        rotation: normalizedRotation,
        width,
        height,
        quality
      };

      if (!bestCandidate || base64.length < bestCandidate.base64.length) {
        bestCandidate = candidate;
      }

      if (base64.length <= maxImageBase64Bytes) {
        return candidate;
      }
    }

    targetWidth = Math.floor(targetWidth * 0.82);
  }

  const bestSizeKb = bestCandidate ? Math.round(bestCandidate.base64.length / 1024) : 0;
  throw new Error(`Imagem ainda ficou grande demais (${bestSizeKb} KB base64). Use uma imagem menos detalhada.`);
}

function updateRotateButton(root) {
  const rotateButton = root.querySelector("#mqtt-image-rotate");
  if (!rotateButton) {
    return;
  }

  rotateButton.disabled = !selectedImageFile;
  rotateButton.textContent = `Rotate: ${imageRotation}°`;
}

function renderImagePreview(root, file) {
  const preview = root.querySelector("#mqtt-image-preview");
  preview.textContent = `${describeImageSource(file)} pronta: ${selectedImage.width}x${selectedImage.height}, rotacao ${selectedImage.rotation}°, ${Math.round(selectedImage.base64.length / 1024)} KB base64, JPEG q${selectedImage.quality}.`;
}

async function handleImageSelection(root) {
  const input = root.querySelector("#mqtt-image");
  const preview = root.querySelector("#mqtt-image-preview");
  const file = input.files && input.files[0] ? input.files[0] : null;

  selectedImage = null;
  selectedImageFile = file;
  imageRotation = 0;
  updateRotateButton(root);
  preview.textContent = "Nenhuma imagem selecionada.";

  if (!file) {
    return;
  }

  try {
    selectedImage = await prepareImagePayload(file, imageRotation);
    renderImagePreview(root, file);
  } catch (error) {
    input.value = "";
    selectedImageFile = null;
    updateRotateButton(root);
    writeLog(root, "Imagem invalida", { message: error.message });
  }
}

async function rotateSelectedImage(root) {
  if (!selectedImageFile) {
    writeLog(root, "Imagem ausente", {
      message: "Selecione ou tire uma foto antes de rotacionar."
    });
    return;
  }

  imageRotation = imageRotation === 90 ? 0 : 90;
  updateRotateButton(root);

  try {
    selectedImage = await prepareImagePayload(selectedImageFile, imageRotation);
    renderImagePreview(root, selectedImageFile);
  } catch (error) {
    selectedImage = null;
    writeLog(root, "Imagem invalida", { message: error.message });
  }
}

function renderStatus(root, data) {
  const client = data.client;
  const broker = data.broker;
  const sunmi = data.sunmi || { state: "down", lastSeenAt: "", staleAfterMs: 15000, lastStatus: null };
  const runtime = data.runtime;
  const lastSunmi = sunmi.lastStatus || runtime.lastSunmiStatus;
  canPublish = broker.state === "up" && client.state === "up" && sunmi.state === "up";

  root.querySelector("#mqtt-status").innerHTML = `
    <span class="badge ${broker.state}">Broker CL4P: ${broker.state}</span>
    <span class="badge ${client.state}">Cliente API: ${client.state}</span>
    <span class="badge ${sunmi.state === "up" ? "connected" : "down"}">Sunmi APK: ${sunmi.state}</span>
    <span class="badge">last publish: ${runtime.lastPublishedAt || "-"}</span>
    <span class="badge">last message: ${runtime.lastMessageAt || "-"}</span>
    <span class="badge">Sunmi last seen: ${sunmi.lastSeenAt || "-"}</span>
  `;

  root.querySelector("#mqtt-sunmi-status").textContent = lastSunmi
    ? formatJson(lastSunmi)
    : "Nenhum heartbeat/status Sunmi recebido ainda. Broker/Cliente API up nao significa que o APK da printer ja conectou.";

  const publishButton = root.querySelector("#mqtt-publish");
  const publishWarning = root.querySelector("#mqtt-publish-warning");
  if (publishButton && publishWarning) {
    publishButton.disabled = !canPublish;
    publishWarning.textContent = canPublish
      ? ""
      : "Publicacao bloqueada: Sunmi offline ou broker/API MQTT desconectado.";
  }
}

function renderTopicOptions(root) {
  const select = root.querySelector("#mqtt-topic-key");
  select.innerHTML = topics
    .map((topic) => `<option value="${topic.key}">${topic.key}</option>`)
    .join("");

  const preferred = topics.find((topic) => topic.key === "sunmiPrintRequest");
  if (preferred) {
    select.value = preferred.key;
  }

  updateResolvedTopic(root);
}

function updateResolvedTopic(root) {
  const topic = findSelectedTopic(root);
  root.querySelector("#mqtt-resolved-topic").value = topic ? topic.topic : "";
  root.querySelector("#mqtt-qos").value = topic ? String(topic.qos) : "0";
  root.querySelector("#mqtt-retain").checked = topic ? Boolean(topic.retain) : false;
}

async function loadMqttStatus(root, options = {}) {
  const response = await apiGet("/api/mqtt/status");
  renderStatus(root, response.data);
  if (options.writeLog !== false) {
    writeLog(root, "Status MQTT atualizado.", response);
  }
}

async function loadTopics(root) {
  const response = await apiGet("/api/mqtt/topics");
  topics = response.data.topics || [];
  renderTopicOptions(root);
}

async function publishMqttMessage(root) {
  if (!canPublish) {
    writeLog(root, "Conexao indisponivel", {
      message: "Publicacao bloqueada: Sunmi offline ou broker/API MQTT desconectado."
    });
    return;
  }

  const topic = findSelectedTopic(root);
  if (!topic) {
    writeLog(root, "Erro", {
      message: "Selecione um topicKey configurado."
    });
    return;
  }

  let payload;
  try {
    payload = JSON.parse(root.querySelector("#mqtt-payload").value);
  } catch (error) {
    writeLog(root, "JSON invalido", {
      message: error.message
    });
    return;
  }

  if (!isPlainObject(payload)) {
    writeLog(root, "JSON invalido", {
      message: "O payload deve ser um objeto JSON."
    });
    return;
  }

  if (selectedImage) {
    payload.image = {
      ...selectedImage,
      mode: root.querySelector("#mqtt-image-mode").value || "photo"
    };
  }

  const response = await apiPost("/api/mqtt/publish", {
    topicKey: topic.key,
    payload,
    qos: Number(root.querySelector("#mqtt-qos").value),
    retain: root.querySelector("#mqtt-retain").checked
  });

  writeLog(root, "Mensagem publicada.", response);
  showSuccessModal(root, "Print job enviado para a fila MQTT.");
  await loadMqttStatus(root);
}

async function sendMqttTest(root) {
  const response = await apiPost("/api/mqtt/test", {});
  writeLog(root, "Teste enviado.", response);
  await loadMqttStatus(root);
}

export async function renderMqttModule(root) {
  stopStatusRefresh();

  root.innerHTML = `
    <div id="mqtt-success-modal" class="toast-modal" hidden role="status" aria-live="polite">
      <div class="toast-card">
        <span class="toast-icon" aria-hidden="true">✓</span>
        <span id="mqtt-success-message">Print job enviado.</span>
      </div>
    </div>

    <section class="panel">
      <h2>MQTT</h2>
      <div id="mqtt-status" class="status-row">
        <span class="badge pending">carregando</span>
      </div>
      <div class="actions">
        <button class="button secondary" id="mqtt-refresh" type="button">Atualizar status</button>
      </div>
    </section>

    <section class="panel">
      <h2>Publicar mensagem</h2>
      <div class="form-grid">
        <div class="field">
          <label for="mqtt-topic-key">Topic key</label>
          <select id="mqtt-topic-key"></select>
        </div>
        <div class="field">
          <label for="mqtt-resolved-topic">Topico resolvido</label>
          <input id="mqtt-resolved-topic" type="text" readonly>
        </div>
        <div class="field">
          <label for="mqtt-qos">QoS</label>
          <select id="mqtt-qos">
            <option value="0">0</option>
            <option value="1">1</option>
            <option value="2">2</option>
          </select>
        </div>
        <div class="field">
          <label for="mqtt-retain">Retain</label>
          <input id="mqtt-retain" type="checkbox">
        </div>
        <div class="field full">
          <label for="mqtt-payload">Payload JSON</label>
          <textarea id="mqtt-payload">${formatJson(buildDefaultPayload())}</textarea>
        </div>
        <div class="field full">
          <label for="mqtt-image">Selecionar ou tirar foto para o topo</label>
          <input id="mqtt-image" type="file" accept="image/png,image/jpeg,image/webp" capture="environment">
          <div id="mqtt-image-preview" class="muted">Nenhuma imagem selecionada ou foto tirada.</div>
        </div>
        <div class="field">
          <label for="mqtt-image-rotate">Rotacao</label>
          <button class="button secondary" id="mqtt-image-rotate" type="button" disabled>Rotate: 0°</button>
        </div>
        <div class="field">
          <label for="mqtt-image-mode">Tipo de imagem</label>
          <select id="mqtt-image-mode">
            <option value="photo">Foto</option>
            <option value="logo">Logo/desenho</option>
          </select>
        </div>
      </div>
      <div class="actions">
        <button class="button" id="mqtt-publish" type="button">Publicar</button>
        <button class="button secondary" id="mqtt-test" type="button">Enviar teste</button>
      </div>
      <div id="mqtt-publish-warning" class="danger-text"></div>
    </section>

    <section class="panel">
      <h2>Ultimo status Sunmi</h2>
      <pre id="mqtt-sunmi-status" class="log">Carregando...</pre>
    </section>

    <section class="panel">
      <h2>Resposta</h2>
      <pre id="mqtt-log" class="log">Pronto.</pre>
    </section>
  `;

  root.querySelector("#mqtt-refresh").addEventListener("click", () => {
    loadMqttStatus(root).catch((error) => writeLog(root, "Erro ao atualizar status.", readableError(error)));
  });
  root.querySelector("#mqtt-topic-key").addEventListener("change", () => updateResolvedTopic(root));
  root.querySelector("#mqtt-image").addEventListener("change", () => {
    handleImageSelection(root).catch((error) => writeLog(root, "Erro ao processar imagem.", { message: error.message }));
  });
  root.querySelector("#mqtt-image-rotate").addEventListener("click", () => {
    rotateSelectedImage(root).catch((error) => writeLog(root, "Erro ao rotacionar imagem.", { message: error.message }));
  });
  root.querySelector("#mqtt-publish").addEventListener("click", () => {
    publishMqttMessage(root).catch((error) => writeLog(root, "Erro ao publicar.", readableError(error)));
  });
  root.querySelector("#mqtt-test").addEventListener("click", () => {
    sendMqttTest(root).catch((error) => writeLog(root, "Erro ao enviar teste.", readableError(error)));
  });

  await loadTopics(root);
  await loadMqttStatus(root);
  statusRefreshTimer = window.setInterval(() => {
    if (!root.isConnected || !root.querySelector("#mqtt-status")) {
      stopStatusRefresh();
      return;
    }

    loadMqttStatus(root, { writeLog: false }).catch((error) => writeLog(root, "Erro ao atualizar status.", readableError(error)));
  }, 5000);
}
