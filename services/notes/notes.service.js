const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const MAX_NOTES = 200;

function ensureDirSync(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function readJsonSafe(filePath, fallback) {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
    return fallback;
  }
}

function extensionForMime(mime) {
  const normalized = String(mime || "").toLowerCase();
  if (normalized.includes("png")) {
    return ".png";
  }
  if (normalized.includes("webp")) {
    return ".webp";
  }
  return ".jpg";
}

function mimeForExtension(fileName) {
  const extension = path.extname(fileName || "").toLowerCase();
  if (extension === ".png") {
    return "image/png";
  }
  if (extension === ".webp") {
    return "image/webp";
  }
  return "image/jpeg";
}

class NotesService {
  constructor({ paths, logger }) {
    this.paths = paths;
    this.logger = logger;
    ensureDirSync(this.paths.notesDir);
    ensureDirSync(this.paths.notesImagesDir);
  }

  loadAll() {
    return readJsonSafe(this.paths.notesDataFile, []);
  }

  saveAll(notes) {
    fs.writeFileSync(this.paths.notesDataFile, JSON.stringify(notes, null, 2), "utf8");
  }

  list({ limit = 50 } = {}) {
    const notes = this.loadAll();
    return notes.slice(0, limit).map((note) => ({
      ...note,
      imageUrl: note.imageFile ? `/notes/images/${note.imageFile}` : null
    }));
  }

  saveImage(id, base64, mime) {
    const buffer = Buffer.from(base64, "base64");
    const fileName = `${id}${extensionForMime(mime)}`;
    const filePath = path.join(this.paths.notesImagesDir, fileName);
    fs.writeFileSync(filePath, buffer);
    return fileName;
  }

  getById(id) {
    const note = this.loadAll().find((entry) => entry.id === id);
    if (!note) {
      return null;
    }
    return {
      ...note,
      imageUrl: note.imageFile ? `/notes/images/${note.imageFile}` : null
    };
  }

  readImageAsBase64(imageFile) {
    const filePath = path.join(this.paths.notesImagesDir, imageFile);
    const buffer = fs.readFileSync(filePath);
    return {
      base64: buffer.toString("base64"),
      mime: mimeForExtension(imageFile)
    };
  }

  updatePrintResult(id, printResult) {
    const notes = this.loadAll();
    const index = notes.findIndex((entry) => entry.id === id);

    if (index === -1) {
      return null;
    }

    const timestamp = new Date().toISOString();
    notes[index] = {
      ...notes[index],
      printStatus: printResult ? printResult.status : notes[index].printStatus,
      printError: printResult && printResult.error ? printResult.error : null,
      printedAt: printResult && printResult.status === "completed" ? timestamp : notes[index].printedAt
    };

    this.saveAll(notes);

    return {
      ...notes[index],
      imageUrl: notes[index].imageFile ? `/notes/images/${notes[index].imageFile}` : null
    };
  }

  create({ text, image, printResult }) {
    const id = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    let imageFile = null;
    if (image && image.base64) {
      imageFile = this.saveImage(id, image.base64, image.mime);
    }

    const note = {
      id,
      timestamp,
      text: text || "",
      imageFile,
      printStatus: printResult ? printResult.status : "skipped",
      printError: printResult && printResult.error ? printResult.error : null,
      printedAt: printResult && printResult.status === "completed" ? timestamp : null
    };

    const notes = this.loadAll();
    notes.unshift(note);
    this.saveAll(notes.slice(0, MAX_NOTES));

    return {
      ...note,
      imageUrl: imageFile ? `/notes/images/${imageFile}` : null
    };
  }
}

module.exports = {
  NotesService
};
