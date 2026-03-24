class MockIntentAdapter {
  getName() {
    return "mock";
  }

  async health() {
    return {
      available: true,
      detail: "heuristic"
    };
  }

  async parse(input) {
    const text = String(input.rawText || input.normalizedText || "").toLowerCase();

    if (!text) {
      return {
        type: "unknown"
      };
    }

    if (/(oi|olá|ola|hello|hey|bom dia|boa tarde|boa noite)/.test(text)) {
      return {
        type: "conversation",
        action: "reply",
        target: "assistant",
        location: "",
        params: {},
        confidence: 0.8
      };
    }

    if (/(espaço|armazenamento|storage|ram|memória|memoria|status|uptime)/.test(text) && !/(refresh|atualizar|scan|escanear|varrer)/.test(text)) {
      return {
        type: "offline_query",
        action: "inspect",
        target: "system",
        location: "",
        params: {},
        confidence: 0.84
      };
    }

    if (/(imprimir|print|sunmi)/.test(text)) {
      return {
        type: "automation",
        action: "request_print",
        target: "sunmi",
        location: "",
        params: {
          content: input.rawText
        },
        confidence: 0.88
      };
    }

    if (/(echo|teste pipeline|test pipeline)/.test(text)) {
      return {
        type: "automation",
        action: "echo",
        target: "automation",
        location: "",
        params: {
          message: input.rawText
        },
        confidence: 0.8
      };
    }

    if (/(scan|escanear|varrer|rescan)/.test(text) && /(storage|armazenamento|disk|disco|otg)/.test(text)) {
      return {
        type: "automation",
        action: "scan",
        target: "storage",
        location: text.includes("otg") ? "external_otg" : "",
        params: {},
        confidence: 0.74
      };
    }

    if (/(refresh|atualizar|atualiza|reload|sincronizar)/.test(text) && /(status|estado|painel|services|serviços)/.test(text)) {
      return {
        type: "automation",
        action: "refresh",
        target: "status",
        location: "",
        params: {},
        confidence: 0.7
      };
    }

    if (/(ping|verificar|probe)/.test(text)) {
      return {
        type: "automation",
        action: "ping",
        target: "service",
        location: "",
        params: {
          service: text.includes("mqtt")
            ? "mqttClient"
            : text.includes("llm")
              ? "llm"
              : text.includes("filebrowser")
                ? "filebrowser"
                : text.includes("jellyfin")
                  ? "jellyfin"
                  : ""
        },
        confidence: 0.68
      };
    }

    if (/(publish|publicar)/.test(text) || text.includes("mqtt")) {
      return {
        type: "automation",
        action: "publish",
        target: "mqtt",
        location: "",
        params: {
          topicKey: "automationEvent",
          payload: {
            message: input.rawText
          }
        },
        confidence: 0.6
      };
    }

    return {
      type: "unknown"
    };
  }
}

module.exports = {
  MockIntentAdapter
};
