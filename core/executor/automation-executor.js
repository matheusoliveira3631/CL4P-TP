class AutomationExecutor {
  constructor({ registry, services, mqttService, runtimeState, logger }) {
    this.registry = registry;
    this.services = services;
    this.mqttService = mqttService;
    this.runtimeState = runtimeState;
    this.logger = logger;
  }

  rememberExecution(result) {
    const snapshot = this.runtimeState.snapshot();
    const lastCommands = Array.isArray(snapshot.lastCommands) ? snapshot.lastCommands : [];
    lastCommands.unshift({
      timestamp: new Date().toISOString(),
      ...result
    });
    this.runtimeState.update("lastCommands", lastCommands.slice(0, 20));
  }

  async executeIntent(intent, context = {}) {
    if (!intent || intent.valid !== true) {
      const result = {
        accepted: false,
        executed: false,
        handler: "",
        status: "rejected",
        error: "invalid_intent"
      };

      this.rememberExecution(result);
      return result;
    }

    if (intent.type !== "automation") {
      const result = {
        accepted: true,
        executed: false,
        handler: "",
        status: "ignored",
        error: "intent_type_not_executable"
      };

      this.rememberExecution(result);
      return result;
    }

    const handler = this.registry.getByIntent(intent);

    if (!handler) {
      await this.mqttService.publishExecutionEvent("rejected", {
        handler: "executor",
        message: "No handler registered",
        result: {
          action: intent.action,
          target: intent.target
        },
        error: "unknown_handler"
      }, context.requestId || "");

      const result = {
        accepted: true,
        executed: false,
        handler: "",
        status: "rejected",
        error: "unknown_handler"
      };

      this.rememberExecution(result);
      return result;
    }

    try {
      const executionResult = await handler.handle(intent, {
        source: context.source || "api",
        requestId: context.requestId || "",
        services: this.services,
        logger: this.logger
      });

      await this.mqttService.publishExecutionEvent("completed", {
        handler: handler.id,
        message: "Handler completed",
        result: executionResult,
        error: null
      }, context.requestId || "");

      const result = {
        accepted: true,
        executed: true,
        handler: handler.id,
        status: "completed",
        result: executionResult
      };

      this.rememberExecution(result);
      return result;
    } catch (error) {
      this.logger.warn("handler_execution_failed", {
        handler: handler.id,
        error: error.code || error.message
      });

      await this.mqttService.publishExecutionEvent("failed", {
        handler: handler.id,
        message: "Handler failed",
        result: {
          action: intent.action,
          target: intent.target
        },
        error: error.code || error.message
      }, context.requestId || "");

      const result = {
        accepted: true,
        executed: false,
        handler: handler.id,
        status: "failed",
        error: error.code || error.message
      };

      this.rememberExecution(result);
      return result;
    }
  }
}

module.exports = {
  AutomationExecutor
};
