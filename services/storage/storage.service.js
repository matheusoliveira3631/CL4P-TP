const fs = require("fs");
const path = require("path");
const { createServiceStatus } = require("../../models/service-status.model");
const { detectRoot } = require("./mount-detector");
const { normalizeRelativePath, resolveWithinRoot } = require("./path-resolver");

class StorageService {
  constructor(config) {
    this.config = config;
    this.roots = config.paths.storage;
    this.cachedStatus = null;
  }

  getRootKeys() {
    return Object.keys(this.roots);
  }

  getMediaRootKeys() {
    return ["repo_media", "internal_shared", "external_otg"].filter((rootKey) => this.roots[rootKey]);
  }

  getRootPath(rootKey) {
    return this.roots[rootKey] || "";
  }

  async ensureRepoDirectories() {
    await Promise.all([
      fs.promises.mkdir(this.config.paths.dataDir, { recursive: true }),
      fs.promises.mkdir(this.config.paths.dbDir, { recursive: true }),
      fs.promises.mkdir(this.config.paths.cacheDir, { recursive: true }),
      fs.promises.mkdir(this.config.paths.uploadsDir, { recursive: true }),
      fs.promises.mkdir(this.config.paths.offlineDir, { recursive: true }),
      fs.promises.mkdir(this.config.paths.mediaDir, { recursive: true }),
      fs.promises.mkdir(this.config.paths.logsDir, { recursive: true }),
      fs.promises.mkdir(this.config.paths.tmpDir, { recursive: true })
    ]);
  }

  async getRootStatus(rootKey) {
    const rootPath = this.getRootPath(rootKey);
    const detected = await detectRoot(rootPath);
    const totalBytes = detected.statfs ? Number(detected.statfs.blocks) * Number(detected.statfs.bsize) : null;
    const freeBytes = detected.statfs ? Number(detected.statfs.bavail) * Number(detected.statfs.bsize) : null;

    return {
      root: rootKey,
      path: rootPath || null,
      configured: detected.configured,
      exists: detected.exists,
      readable: detected.readable,
      writable: detected.writable,
      available: detected.available,
      totalBytes,
      freeBytes,
      usedBytes: totalBytes !== null && freeBytes !== null ? totalBytes - freeBytes : null,
      error: detected.error || ""
    };
  }

  buildServiceStatus(summary) {
    const state = summary.availableRoots === 0 ? "down" : summary.inaccessibleRoots > 0 ? "degraded" : "up";

    return createServiceStatus({
      name: "storage",
      state,
      details: summary
    });
  }

  async scanRoots() {
    const rootList = await Promise.all(this.getRootKeys().map((rootKey) => this.getRootStatus(rootKey)));
    const roots = Object.fromEntries(rootList.map((entry) => [entry.root, entry]));
    const summary = rootList.reduce(
      (accumulator, entry) => {
        if (entry.configured) {
          accumulator.configuredRoots += 1;
        }

        if (entry.available) {
          accumulator.availableRoots += 1;
        }

        if (entry.configured && !entry.available) {
          accumulator.inaccessibleRoots += 1;
        }

        return accumulator;
      },
      {
        configuredRoots: 0,
        availableRoots: 0,
        inaccessibleRoots: 0
      }
    );

    this.cachedStatus = {
      timestamp: new Date().toISOString(),
      roots,
      summary,
      service: this.buildServiceStatus(summary)
    };

    return this.cachedStatus;
  }

  async getStatus() {
    return this.scanRoots();
  }

  async ensureAvailableRoot(rootKey) {
    const status = await this.getStatus();
    const root = status.roots[rootKey];

    if (!root) {
      const error = new Error("unknown_root");
      error.code = "unknown_root";
      throw error;
    }

    if (!root.configured) {
      const error = new Error("root_not_configured");
      error.code = "root_not_configured";
      throw error;
    }

    if (!root.available) {
      const error = new Error(root.error || "root_unavailable");
      error.code = root.error || "root_unavailable";
      throw error;
    }

    return root.path;
  }

  resolvePath(rootKey, relativePath = "") {
    const rootPath = this.getRootPath(rootKey);

    if (!rootPath) {
      const error = new Error("root_not_configured");
      error.code = "root_not_configured";
      throw error;
    }

    return resolveWithinRoot(rootPath, relativePath);
  }

  async listDirectory(rootKey, relativePath = "", options = {}) {
    await this.ensureAvailableRoot(rootKey);
    const resolvedPath = this.resolvePath(rootKey, relativePath);
    const entries = await fs.promises.readdir(resolvedPath.resolved, { withFileTypes: true });
    const limit = Number.isFinite(options.limit) ? options.limit : this.config.media.scanLimit;

    return entries.slice(0, limit).map((entry) => {
      const childPath = path.join(resolvedPath.normalized, entry.name).replaceAll("\\", "/");
      return {
        name: entry.name,
        relativePath: childPath,
        type: entry.isDirectory() ? "directory" : "file"
      };
    });
  }

  async statPath(rootKey, relativePath = "") {
    await this.ensureAvailableRoot(rootKey);
    const resolvedPath = this.resolvePath(rootKey, relativePath);
    const stats = await fs.promises.stat(resolvedPath.resolved);

    return {
      root: rootKey,
      absolutePath: resolvedPath.resolved,
      relativePath: normalizeRelativePath(resolvedPath.normalized),
      name: path.basename(resolvedPath.resolved),
      isFile: stats.isFile(),
      isDirectory: stats.isDirectory(),
      size: stats.size,
      mtime: stats.mtime.toISOString()
    };
  }
}

module.exports = {
  StorageService
};
