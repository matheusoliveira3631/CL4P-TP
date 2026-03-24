const path = require("path");

function resolveOptionalPath(value, rootDir) {
  if (!value) {
    return null;
  }

  if (path.isAbsolute(value)) {
    return path.normalize(value);
  }

  return path.resolve(rootDir, value);
}

function createPaths(rootDir, env = process.env) {
  const resolveFromRoot = (...segments) => path.resolve(rootDir, ...segments);

  return {
    rootDir,
    binDir: resolveFromRoot("bin"),
    configDir: resolveFromRoot("config"),
    docsDir: resolveFromRoot("docs"),
    dataDir: resolveFromRoot("data"),
    dbDir: resolveFromRoot("data", "db"),
    cacheDir: resolveFromRoot("data", "cache"),
    uploadsDir: resolveFromRoot("data", "uploads"),
    offlineDir: resolveFromRoot("data", "offline"),
    logsDir: resolveFromRoot("logs"),
    mediaDir: resolveFromRoot("media"),
    publicDir: resolveFromRoot("public"),
    statusPageDir: resolveFromRoot("public", "status"),
    scriptsDir: resolveFromRoot("scripts"),
    tmpDir: resolveFromRoot("tmp"),
    storage: {
      repo_media: resolveFromRoot("media"),
      repo_data: resolveFromRoot("data"),
      internal_shared: resolveOptionalPath(env.CL4PTP_INTERNAL_SHARED, rootDir),
      external_otg: resolveOptionalPath(env.CL4PTP_EXTERNAL_OTG, rootDir)
    }
  };
}

module.exports = {
  createPaths
};
