const state = {
  rotation: 0,
  sourceImage: null,
  stream: null
};

function isMobileViewport() {
  return window.matchMedia("(max-width: 768px)").matches;
}

function hasCameraSupport() {
  return Boolean(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

function getToken() {
  let token = localStorage.getItem("cl4ptpApiToken");
  if (!token) {
    token = window.prompt("Token da API do CL4P-TP (CL4PTP_API_TOKEN):", "");
    if (token) {
      localStorage.setItem("cl4ptpApiToken", token);
    }
  }
  return token;
}

function setFormStatus(message, variant) {
  const el = document.getElementById("formStatus");
  el.textContent = message;
  el.className = variant ? `hint ${variant}` : "hint";
}

function showImagePreview(show) {
  document.getElementById("imagePreviewWrap").hidden = !show;
}

function drawToCanvas(source, naturalWidth, naturalHeight) {
  const canvas = document.getElementById("imageCanvas");
  const rotation = ((state.rotation % 360) + 360) % 360;
  const swapped = rotation === 90 || rotation === 270;

  canvas.width = swapped ? naturalHeight : naturalWidth;
  canvas.height = swapped ? naturalWidth : naturalHeight;

  const ctx = canvas.getContext("2d");
  ctx.save();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.drawImage(source, -naturalWidth / 2, -naturalHeight / 2, naturalWidth, naturalHeight);
  ctx.restore();
}

function setSourceFromImageElement(img) {
  state.sourceImage = { element: img, width: img.naturalWidth, height: img.naturalHeight };
  state.rotation = 0;
  drawToCanvas(img, img.naturalWidth, img.naturalHeight);
  showImagePreview(true);
}

function loadFileAsImage(file) {
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => setSourceFromImageElement(img);
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}

function setupImageInput() {
  const input = document.getElementById("imageInput");
  input.addEventListener("change", () => {
    const file = input.files && input.files[0];
    if (file) {
      loadFileAsImage(file);
    }
  });
}

function setCameraMode(active) {
  document.getElementById("attachRow").hidden = active;
  document.getElementById("cameraControlsRow").hidden = !active;
  document.getElementById("cameraPreview").hidden = !active;
}

function stopCamera() {
  if (state.stream) {
    state.stream.getTracks().forEach((track) => track.stop());
    state.stream = null;
  }
  setCameraMode(false);
}

async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
      audio: false
    });
    state.stream = stream;
    const video = document.getElementById("cameraPreview");
    video.srcObject = stream;
    setCameraMode(true);
  } catch (error) {
    setFormStatus(
      "Não foi possível acessar a câmera (pode exigir HTTPS neste navegador).",
      "bad"
    );
  }
}

function captureFromVideo() {
  const video = document.getElementById("cameraPreview");
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = video.videoWidth;
  tempCanvas.height = video.videoHeight;
  tempCanvas.getContext("2d").drawImage(video, 0, 0);

  const img = new Image();
  img.onload = () => {
    setSourceFromImageElement(img);
    stopCamera();
  };
  img.src = tempCanvas.toDataURL("image/jpeg", 0.92);
}

function setupCamera() {
  const cameraButton = document.getElementById("cameraButton");

  if (isMobileViewport() && hasCameraSupport()) {
    cameraButton.hidden = false;
  }

  cameraButton.addEventListener("click", startCamera);
  document.getElementById("captureButton").addEventListener("click", captureFromVideo);
  document.getElementById("cancelCameraButton").addEventListener("click", stopCamera);
}

function setupImageControls() {
  document.getElementById("rotateButton").addEventListener("click", () => {
    if (!state.sourceImage) {
      return;
    }
    state.rotation = (state.rotation + 90) % 360;
    drawToCanvas(state.sourceImage.element, state.sourceImage.width, state.sourceImage.height);
  });

  document.getElementById("removeImageButton").addEventListener("click", () => {
    state.sourceImage = null;
    state.rotation = 0;
    document.getElementById("imageInput").value = "";
    showImagePreview(false);
  });
}

function canvasToBase64() {
  const canvas = document.getElementById("imageCanvas");
  const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
  return dataUrl.split(",")[1];
}

function formatTimestamp(value) {
  try {
    return new Date(value).toLocaleString();
  } catch (error) {
    return value;
  }
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}

async function loadHistory() {
  try {
    const response = await fetch("/notes/list");
    const payload = await response.json();
    const container = document.getElementById("notesList");

    if (!payload.ok || !payload.notes.length) {
      container.innerHTML = '<p class="hint">Nenhuma nota ainda.</p>';
      return;
    }

    container.innerHTML = payload.notes
      .map((note) => `
        <div class="note-item" data-note-id="${note.id}">
          <div class="meta">
            <span>${formatTimestamp(note.timestamp)}</span>
            <span class="note-status ${note.printStatus}">${note.printStatus}</span>
          </div>
          ${note.text ? `<div class="note-text">${escapeHtml(note.text)}</div>` : ""}
          ${note.imageUrl ? `<img src="${note.imageUrl}" alt="Nota" />` : ""}
          <button type="button" class="reprint-button" data-reprint="${note.id}">↻ Reimprimir</button>
        </div>
      `)
      .join("");

    container.querySelectorAll("[data-reprint]").forEach((button) => {
      button.addEventListener("click", () => reprintNote(button.dataset.reprint, button));
    });
  } catch (error) {
    document.getElementById("notesList").innerHTML = '<p class="hint bad">Falha ao carregar histórico.</p>';
  }
}

async function reprintNote(id, button) {
  const token = getToken();
  if (!token) {
    setFormStatus("Token não informado.", "bad");
    return;
  }

  const originalLabel = button.textContent;
  button.disabled = true;
  button.textContent = "Reimprimindo...";

  try {
    const response = await fetch(`/notes/${id}/reprint`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const payload = await response.json();

    if (!response.ok || payload.ok === false) {
      throw new Error(payload.error || "Falha ao reimprimir");
    }

    if (payload.execution && payload.execution.status !== "completed") {
      setFormStatus(`Reimpressão falhou (${payload.execution.error || payload.execution.status}).`, "bad");
    } else {
      setFormStatus("Nota reimpressa.", "ok");
    }

    await loadHistory();
  } catch (error) {
    if (error.message === "invalid_api_token") {
      localStorage.removeItem("cl4ptpApiToken");
    }
    setFormStatus(`Erro ao reimprimir: ${error.message}`, "bad");
    button.disabled = false;
    button.textContent = originalLabel;
  }
}

function setupForm() {
  const form = document.getElementById("noteForm");
  const submitButton = document.getElementById("submitButton");
  const textArea = document.getElementById("noteText");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const text = textArea.value.trim();
    const hasImage = Boolean(state.sourceImage);

    if (!text && !hasImage) {
      setFormStatus("Escreva algo ou anexe uma imagem.", "bad");
      return;
    }

    const token = getToken();
    if (!token) {
      setFormStatus("Token não informado.", "bad");
      return;
    }

    submitButton.disabled = true;
    setFormStatus("Enviando...", "");

    const body = { text };
    if (hasImage) {
      body.image = {
        base64: canvasToBase64(),
        mime: "image/jpeg",
        mode: "photo"
      };
    }

    try {
      const response = await fetch("/notes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      const payload = await response.json();

      if (!response.ok || payload.ok === false) {
        throw new Error(payload.error || "Falha ao enviar nota");
      }

      if (payload.execution && payload.execution.status !== "completed") {
        setFormStatus(`Nota salva, mas a impressão falhou (${payload.execution.error || payload.execution.status}).`, "bad");
      } else {
        setFormStatus(`Enviado às ${new Date().toLocaleTimeString()}.`, "ok");
      }

      textArea.value = "";
      state.sourceImage = null;
      state.rotation = 0;
      document.getElementById("imageInput").value = "";
      showImagePreview(false);
      await loadHistory();
    } catch (error) {
      if (error.message === "invalid_api_token") {
        localStorage.removeItem("cl4ptpApiToken");
      }
      setFormStatus(`Erro: ${error.message}`, "bad");
    } finally {
      submitButton.disabled = false;
    }
  });
}

setupImageInput();
setupCamera();
setupImageControls();
setupForm();
loadHistory();
