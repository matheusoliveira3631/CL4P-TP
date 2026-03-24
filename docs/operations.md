# Operations

## Start

```bash
npm start
```

## Dev Mode

```bash
npm run dev
```

## Quick Checks

```bash
npm run doctor
npm run status
```

## PM2

```bash
npm run pm2:start
npm run pm2:logs
npm run pm2:stop
```

## Optional File Browser Wrapper

```bash
node bin/filebrowser-wrapper.js
```

This only works when:

- `CL4PTP_FILEBROWSER_ENABLED=true`
- `CL4PTP_FILEBROWSER_BINARY` is configured

The wrapper is intentionally thin: it only spawns the configured binary and does not provision File Browser auth, database, or settings for you.

## Standalone MQTT Broker

```bash
node bin/cl4ptp-mqtt-broker.js
```

Useful only if you want the broker outside the main API process.
