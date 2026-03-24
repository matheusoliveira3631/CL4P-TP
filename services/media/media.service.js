const fs = require("fs/promises");
const path = require("path");
const { createServiceStatus } = require("../../models/service-status.model");

const MEDIA_TYPES = {
  image: [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".heic"],
  video: [".mp4", ".mkv", ".webm", ".mov", ".m4v", ".avi"],
  audio: [".mp3", ".aac", ".ogg", ".wav", ".flac", ".m4a"]
};

class MediaService {
  constructor({ storageService, runtimeState }) {
    this.storageService = storageService;
    this.runtimeState = runtimeState;
  }

  detectMediaType(fileName) {
    const extension = path.extname(fileName).toLowerCase();

    if (MEDIA_TYPES.image.includes(extension)) {
      return "image";
    }

    if (MEDIA_TYPES.video.includes(extension)) {
      return "video";
    }

    if (MEDIA_TYPES.audio.includes(extension)) {
      return "audio";
    }

    return "other";
  }

  inferContentType(fileName) {
    const extension = path.extname(fileName).toLowerCase();
    const contentTypes = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".webp": "image/webp",
      ".bmp": "image/bmp",
      ".heic": "image/heic",
      ".mp4": "video/mp4",
      ".mkv": "video/x-matroska",
      ".webm": "video/webm",
      ".mov": "video/quicktime",
      ".m4v": "video/x-m4v",
      ".avi": "video/x-msvideo",
      ".mp3": "audio/mpeg",
      ".aac": "audio/aac",
      ".ogg": "audio/ogg",
      ".wav": "audio/wav",
      ".flac": "audio/flac",
      ".m4a": "audio/mp4"
    };

    return contentTypes[extension] || "application/octet-stream";
  }

  encodeRelativePath(relativePath) {
    return String(relativePath || "")
      .split("/")
      .filter(Boolean)
      .map((segment) => encodeURIComponent(segment))
      .join("/");
  }

  async getLibrary(rootKey = "", relativePath = "") {
    const storageStatus = await this.storageService.getStatus();
    const allowedRoots = this.storageService
      .getMediaRootKeys()
      .filter((entry) => storageStatus.roots[entry] && storageStatus.roots[entry].available);

    if (rootKey && !this.storageService.getMediaRootKeys().includes(rootKey)) {
      const error = new Error("root_not_media_enabled");
      error.code = "root_not_media_enabled";
      throw error;
    }

    const rootsToInspect = rootKey ? [rootKey] : allowedRoots;
    const roots = {};

    for (const currentRoot of rootsToInspect) {
      try {
        const entries = await this.storageService.listDirectory(currentRoot, relativePath, { limit: 200 });
        roots[currentRoot] = {
          available: true,
          path: relativePath,
          files: entries
            .filter((entry) => entry.type === "directory" || this.detectMediaType(entry.name) !== "other")
            .map((entry) => ({
              ...entry,
              mediaType: entry.type === "directory" ? "directory" : this.detectMediaType(entry.name),
              streamUrl: entry.type === "file" ? `/media/stream/${currentRoot}/${this.encodeRelativePath(entry.relativePath)}` : ""
            }))
        };
      } catch (error) {
        roots[currentRoot] = {
          available: false,
          path: relativePath,
          files: [],
          error: error.code || error.message
        };
      }
    }

    this.runtimeState.update("media.lastScanAt", new Date().toISOString());

    return {
      roots
    };
  }

  async getStreamDescriptor(rootKey, relativePath) {
    if (!this.storageService.getMediaRootKeys().includes(rootKey)) {
      const error = new Error("root_not_media_enabled");
      error.code = "root_not_media_enabled";
      throw error;
    }

    const descriptor = await this.storageService.statPath(rootKey, relativePath);

    if (!descriptor.isFile) {
      const error = new Error("not_a_file");
      error.code = "not_a_file";
      throw error;
    }

    const mediaType = this.detectMediaType(descriptor.name);

    if (mediaType === "other") {
      const error = new Error("unsupported_media_type");
      error.code = "unsupported_media_type";
      throw error;
    }

    await fs.access(descriptor.absolutePath);

    return {
      ...descriptor,
      mediaType,
      contentType: this.inferContentType(descriptor.name)
    };
  }

  async getStatus({ fileBrowserStatus, jellyfinStatus }) {
    const storageStatus = await this.storageService.getStatus();
    const availableRoots = this.storageService
      .getMediaRootKeys()
      .filter((entry) => storageStatus.roots[entry] && storageStatus.roots[entry].available);

    return {
      service: createServiceStatus({
        name: "media",
        state: availableRoots.length > 0 ? "up" : "degraded",
        details: {
          availableRoots,
          lastScanAt: this.runtimeState.snapshot().media.lastScanAt || "",
          fileBrowser: fileBrowserStatus.state,
          jellyfin: jellyfinStatus.state
        }
      }),
      fallback: {
        enabled: true,
        availableRoots,
        lastScanAt: this.runtimeState.snapshot().media.lastScanAt || ""
      }
    };
  }
}

module.exports = {
  MediaService
};
