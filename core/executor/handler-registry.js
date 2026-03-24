const { buildIntentKey } = require("../../models/intent.model");

function createHandlerRegistry() {
  const handlers = new Map();

  function register(action, target, id, handler) {
    handlers.set(buildIntentKey({ action, target }), {
      id,
      action,
      target,
      handle: handler
    });
  }

  function getByIntent(intent) {
    return handlers.get(buildIntentKey(intent));
  }

  function list() {
    return Array.from(handlers.values()).map((entry) => ({
      id: entry.id,
      action: entry.action,
      target: entry.target
    }));
  }

  return {
    getByIntent,
    list,
    register
  };
}

module.exports = {
  createHandlerRegistry
};
