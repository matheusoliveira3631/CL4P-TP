const path = require("path");

function normalizeRelativePath(relativePath = "") {
  return String(relativePath || "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .trim();
}

function resolveWithinRoot(rootPath, relativePath = "") {
  const normalized = normalizeRelativePath(relativePath);
  const resolved = path.resolve(rootPath, normalized);
  const relativeToRoot = path.relative(rootPath, resolved);

  if (relativeToRoot.startsWith("..") || path.isAbsolute(relativeToRoot)) {
    const error = new Error("path_outside_root");
    error.code = "path_outside_root";
    throw error;
  }

  return {
    normalized,
    resolved
  };
}

module.exports = {
  normalizeRelativePath,
  resolveWithinRoot
};
