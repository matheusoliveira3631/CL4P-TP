function extractToken(req) {
  const authHeader = req.get("authorization") || "";
  const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);

  if (bearerMatch) {
    return bearerMatch[1];
  }

  return req.get("x-cl4ptp-token") || req.get("x-api-token") || "";
}

function createAuthMiddleware(config) {
  return function authMiddleware(req, res, next) {
    if (req.method === "GET" || req.method === "HEAD") {
      next();
      return;
    }

    const token = extractToken(req);

    if (!config.security.apiToken) {
      res.status(503).json({
        ok: false,
        error: "api_token_not_configured"
      });
      return;
    }

    if (token !== config.security.apiToken) {
      res.status(401).json({
        ok: false,
        error: "invalid_api_token"
      });
      return;
    }

    next();
  };
}

module.exports = {
  createAuthMiddleware
};
