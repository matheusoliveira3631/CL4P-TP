import { getApiToken, setApiToken } from "../api.js";

export function renderSettingsModule(root) {
  root.innerHTML = `
    <section class="panel">
      <h2>Settings</h2>
      <p class="muted">Token usado apenas nesta sessao do navegador para chamadas POST. A GUI inicia com changeme-cl4ptp; altere aqui se CL4PTP_API_TOKEN na sua .env for diferente.</p>
      <div class="form-grid">
        <div class="field full">
          <label for="api-token">API token</label>
          <input id="api-token" type="password" autocomplete="off" value="${getApiToken()}">
        </div>
      </div>
      <div class="actions">
        <button class="button" id="save-token" type="button">Salvar token da sessao</button>
      </div>
      <pre id="settings-log" class="log">Token padrao ativo. POST usa header x-cl4ptp-token.</pre>
    </section>
  `;

  root.querySelector("#save-token").addEventListener("click", () => {
    setApiToken(root.querySelector("#api-token").value.trim());
    root.querySelector("#settings-log").textContent = "Token salvo em sessionStorage para esta aba.";
  });
}
