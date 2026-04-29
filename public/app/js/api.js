const TOKEN_KEY = "cl4ptp.apiToken";
const DEFAULT_TOKEN = "changeme-cl4ptp";

async function parseJson(response) {
  const payload = await response.json().catch(() => ({
    ok: false,
    error: "invalid_json_response",
    message: "Resposta inválida da API."
  }));

  if (!response.ok) {
    const error = new Error(payload.message || payload.error || "Falha na API.");
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

export function getApiToken() {
  return sessionStorage.getItem(TOKEN_KEY) || DEFAULT_TOKEN;
}

export function setApiToken(token) {
  sessionStorage.setItem(TOKEN_KEY, token || DEFAULT_TOKEN);
}

export async function apiGet(path) {
  const response = await fetch(path, {
    headers: {
      accept: "application/json"
    }
  });

  return parseJson(response);
}

export async function apiPost(path, body) {
  const token = getApiToken();
  const headers = {
    accept: "application/json",
    "content-type": "application/json"
  };

  if (token) {
    headers["x-cl4ptp-token"] = token;
  }

  const response = await fetch(path, {
    method: "POST",
    headers,
    body: JSON.stringify(body || {})
  });

  return parseJson(response);
}
