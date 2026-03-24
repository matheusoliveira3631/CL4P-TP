const os = require("os");

class SystemStatusService {
  getMetrics(startedAt) {
    const memoryUsage = process.memoryUsage();

    return {
      timestamp: new Date().toISOString(),
      process: {
        pid: process.pid,
        uptimeSec: Math.round(process.uptime()),
        startedAt
      },
      runtime: {
        platform: process.platform,
        arch: process.arch,
        node: process.version
      },
      host: {
        hostname: os.hostname(),
        uptimeSec: Math.round(os.uptime())
      },
      memory: {
        totalBytes: os.totalmem(),
        freeBytes: os.freemem(),
        rssBytes: memoryUsage.rss,
        heapTotalBytes: memoryUsage.heapTotal,
        heapUsedBytes: memoryUsage.heapUsed,
        externalBytes: memoryUsage.external
      }
    };
  }
}

module.exports = {
  SystemStatusService
};
