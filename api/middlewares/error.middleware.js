function statusFromError(error) {
  const code = error.code || "";
  const isUriDecodeError = error instanceof URIError || /Failed to decode param/i.test(error.message || "");

  if (["unknown_root", "root_not_configured", "root_unavailable", "not_a_file", "unsupported_media_type"].includes(code)) {
    return 404;
  }

  if (isUriDecodeError) {
    return 400;
  }

  if (["topic_not_allowed", "payload_object_required", "topic_key_required", "path_outside_root", "root_not_media_enabled", "invalid_encoded_path"].includes(code)) {
    return 400;
  }

  return error.statusCode || 500;
}

function errorMiddleware(logger, environment) {
  return function onError(error, _req, res, _next) {
    const normalizedCode =
      error.code ||
      (error instanceof URIError || /Failed to decode param/i.test(error.message || "")
        ? "invalid_encoded_path"
        : "");

    logger.error("request_failed", {
      error: normalizedCode || error.message
    });

    res.status(statusFromError(error)).json({
      ok: false,
      error: normalizedCode || error.message || "internal_error",
      ...(environment === "development" ? { stack: error.stack } : {})
    });
  };
}

module.exports = {
  errorMiddleware
};
