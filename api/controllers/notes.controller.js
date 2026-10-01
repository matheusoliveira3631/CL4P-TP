const MAX_IMAGE_BASE64_LENGTH = 8 * 1024 * 1024; // ~8MB of base64 text

function createNotesController({ notesService, executor }) {
  return {
    list(req, res) {
      const limit = Number.parseInt(req.query.limit, 10);
      res.json({
        ok: true,
        notes: notesService.list({ limit: Number.isFinite(limit) && limit > 0 ? limit : 50 })
      });
    },

    async create(req, res) {
      const body = req.body || {};
      const text = typeof body.text === "string" ? body.text.trim() : "";
      const image = body.image && typeof body.image === "object" ? body.image : null;

      if (!text && !image) {
        res.status(400).json({ ok: false, error: "note_requires_text_or_image" });
        return;
      }

      if (image) {
        if (typeof image.base64 !== "string" || !image.base64) {
          res.status(400).json({ ok: false, error: "invalid_image" });
          return;
        }
        if (image.base64.length > MAX_IMAGE_BASE64_LENGTH) {
          res.status(413).json({ ok: false, error: "image_too_large" });
          return;
        }
      }

      const intent = {
        type: "automation",
        action: "request_print",
        target: "sunmi",
        source: "notes-ui",
        valid: true,
        errors: [],
        confidence: 1,
        rawText: text,
        normalizedText: text,
        location: "",
        params: {
          content: text,
          image: image ? { base64: image.base64, mime: image.mime, mode: image.mode } : undefined
        }
      };

      const execution = await executor.executeIntent(intent, {
        source: "notes-ui",
        requestId: req.get("x-request-id") || ""
      });

      const note = notesService.create({
        text,
        image,
        printResult: execution
      });

      res.json({ ok: true, note, execution });
    }
  };
}

module.exports = {
  createNotesController
};
