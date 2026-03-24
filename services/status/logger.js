function createLogger(level = "info") {
  const levels = ["debug", "info", "warn", "error"];
  const currentIndex = levels.indexOf(level);

  function shouldLog(entryLevel) {
    const entryIndex = levels.indexOf(entryLevel);
    return entryIndex >= Math.max(currentIndex, 0);
  }

  function write(entryLevel, message, meta) {
    if (!shouldLog(entryLevel)) {
      return;
    }

    const payload = {
      level: entryLevel,
      message,
      ...(meta ? { meta } : {}),
      timestamp: new Date().toISOString()
    };

    const line = JSON.stringify(payload);
    if (entryLevel === "error") {
      console.error(line);
      return;
    }
    if (entryLevel === "warn") {
      console.warn(line);
      return;
    }
    console.log(line);
  }

  return {
    debug(message, meta) {
      write("debug", message, meta);
    },
    info(message, meta) {
      write("info", message, meta);
    },
    warn(message, meta) {
      write("warn", message, meta);
    },
    error(message, meta) {
      write("error", message, meta);
    }
  };
}

module.exports = {
  createLogger
};
