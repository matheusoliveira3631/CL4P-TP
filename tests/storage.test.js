const test = require("node:test");
const assert = require("node:assert/strict");
const os = require("os");
const fs = require("fs/promises");
const path = require("path");
const { loadConfig } = require("../config");
const { StorageService } = require("../services/storage/storage.service");

test("storage resolves repo roots and blocks unknown roots", async () => {
  const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), "cl4ptp-storage-"));
  const config = loadConfig({ rootDir });
  const storage = new StorageService(config);

  await storage.ensureRepoDirectories();
  await storage.scanRoots();

  const status = await storage.getStatus();
  assert.equal(status.roots.repo_media.available, true);
  assert.equal(status.roots.repo_data.available, true);

  await assert.rejects(() => storage.ensureAvailableRoot("missing"), /unknown_root/);
});

test("storage status refresh reflects root disappearance", async () => {
  const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), "cl4ptp-storage-refresh-"));
  const config = loadConfig({ rootDir });
  const storage = new StorageService(config);

  await storage.ensureRepoDirectories();
  await storage.scanRoots();
  await fs.rm(config.paths.mediaDir, { recursive: true, force: true });

  const status = await storage.getStatus();

  assert.equal(status.roots.repo_media.available, false);
});
