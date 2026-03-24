const SERVICE_STATES = ["up", "down", "degraded", "disabled"];

function createServiceStatus(input = {}) {
  const state = SERVICE_STATES.includes(input.state) ? input.state : "down";

  return {
    name: input.name || "unknown",
    state,
    ok: state === "up",
    timestamp: input.timestamp || new Date().toISOString(),
    details: input.details || {},
    error: input.error || ""
  };
}

function summarizeServiceStates(serviceMap = {}) {
  const summary = {
    up: 0,
    down: 0,
    degraded: 0,
    disabled: 0
  };

  Object.values(serviceMap).forEach((service) => {
    if (service && summary[service.state] !== undefined) {
      summary[service.state] += 1;
    }
  });

  return summary;
}

module.exports = {
  SERVICE_STATES,
  createServiceStatus,
  summarizeServiceStates
};
