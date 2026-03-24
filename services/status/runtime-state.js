function createRuntimeState() {
  const state = {
    startedAt: new Date().toISOString(),
    lastCommands: [],
    mqtt: {
      clientConnected: false,
      brokerRunning: false,
      lastError: "",
      lastMessageAt: "",
      lastPublishedAt: ""
    },
    media: {
      lastScanAt: ""
    }
  };

  return {
    snapshot() {
      return JSON.parse(JSON.stringify(state));
    },
    update(path, value) {
      const segments = path.split(".");
      let cursor = state;

      while (segments.length > 1) {
        const segment = segments.shift();

        if (!cursor[segment] || typeof cursor[segment] !== "object") {
          cursor[segment] = {};
        }

        cursor = cursor[segment];
      }

      cursor[segments[0]] = value;
    }
  };
}

module.exports = {
  createRuntimeState
};
