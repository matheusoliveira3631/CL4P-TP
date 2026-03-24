const fs = require("fs");

function createMediaController({ mediaService }) {
  return {
    async library(req, res) {
      const root = typeof req.query.root === "string" ? req.query.root : "";
      const relativePath = typeof req.query.path === "string" ? req.query.path : "";

      const library = await mediaService.getLibrary(root, relativePath);
      res.json({
        ok: true,
        library
      });
    },
    async stream(req, res) {
      const root = req.params.root;
      let relativePath = "";

      try {
        relativePath = decodeURIComponent(req.params[0] || "");
      } catch (_error) {
        res.status(400).json({
          ok: false,
          error: "invalid_encoded_path"
        });
        return;
      }

      const descriptor = await mediaService.getStreamDescriptor(root, relativePath);
      const range = req.headers.range;

      if (!range) {
        res.setHeader("Content-Type", descriptor.contentType);
        res.setHeader("Content-Length", descriptor.size);
        fs.createReadStream(descriptor.absolutePath).pipe(res);
        return;
      }

      const [startValue, endValue] = range.replace("bytes=", "").split("-");
      const start = Number(startValue);
      const end = endValue ? Number(endValue) : descriptor.size - 1;

      if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || end >= descriptor.size) {
        res.status(416).end();
        return;
      }

      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${descriptor.size}`,
        "Accept-Ranges": "bytes",
        "Content-Length": end - start + 1,
        "Content-Type": descriptor.contentType
      });

      fs.createReadStream(descriptor.absolutePath, { start, end }).pipe(res);
    }
  };
}

module.exports = {
  createMediaController
};
