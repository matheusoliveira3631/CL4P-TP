module.exports = {
  apps: [
    {
      name: "cl4ptp-api",
      script: "bin/cl4ptp-api.js",
      env: {
        NODE_ENV: "production"
      },
      autorestart: true,
      watch: false
    }
  ]
};
