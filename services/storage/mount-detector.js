const fs = require("fs");

async function detectRoot(rootPath) {
  if (!rootPath) {
    return {
      configured: false,
      exists: false,
      readable: false,
      writable: false,
      available: false,
      statfs: null,
      error: ""
    };
  }

  let exists = false;
  let readable = false;
  let writable = false;
  let statfs = null;
  let error = "";

  try {
    const stats = await fs.promises.stat(rootPath);
    exists = stats.isDirectory() || stats.isFile();
  } catch (statError) {
    error = statError.code || statError.message;
  }

  if (exists) {
    try {
      await fs.promises.access(rootPath, fs.constants.R_OK);
      readable = true;
    } catch (readError) {
      error = readError.code || readError.message;
    }
  }

  if (readable) {
    try {
      await fs.promises.access(rootPath, fs.constants.W_OK);
      writable = true;
    } catch (_writeError) {
      writable = false;
    }
  }

  if (readable && typeof fs.promises.statfs === "function") {
    statfs = await fs.promises.statfs(rootPath).catch(() => null);
  }

  return {
    configured: true,
    exists,
    readable,
    writable,
    available: exists && readable,
    statfs,
    error
  };
}

module.exports = {
  detectRoot
};
