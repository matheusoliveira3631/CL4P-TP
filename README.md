# CL4P-TP

CL4P-TP is an offline-first personal server MVP aimed at Android + Termux, with Node.js as the core runtime and a modular architecture that can grow toward local LLM parsing, MQTT automation, lightweight NAS access, and media streaming.

This repository is honest by design:

- Implemented now: Express API, status page, storage abstraction, intent parser with `mock` adapter, automation executor, MQTT client with embedded broker enabled by default and external-broker override, basic media library + HTTP `Range` streaming.
- Optional/scaffolded: File Browser integration, `llama.cpp` adapter, standalone embedded MQTT broker script, PM2 runtime wrapper.
- Experimental/not assumed in MVP: Jellyfin on Termux/Android.

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Copy `.env.example` to `.env` if you want to override defaults.

3. Start the API:

```bash
npm start
```

4. Open the status page:

- `http://127.0.0.1:3000/status-page/`
- Or a LAN address exposed by `/status`

## Default API Token

Mutable endpoints require a token. By default the example token is:

```text
changeme-cl4ptp
```

Send it as:

- `Authorization: Bearer <token>`
- or `x-cl4ptp-token: <token>`

## API Surface

- `GET /health`
- `GET /status`
- `GET /services/status`
- `GET /llm/health`
- `GET /storage/status`
- `POST /intent/parse`
- `POST /command`
- `POST /automation/publish`
- `GET /media/library`
- `GET /media/stream/:root/*`

## Runtime Notes

- The API is LAN-accessible by default (`0.0.0.0`) and protects mutating endpoints with a token.
- The MQTT broker is embedded by default for self-contained local runs, but the client can target an external broker through config.
- File Browser is not bundled. This repo exposes health/status hooks and an optional wrapper script only.
- Jellyfin is intentionally not required for MVP success.

## Useful Commands

```bash
npm run doctor
npm run status
npm test
```

## Docs

- [Architecture](docs/architecture.md)
- [MQTT Topics](docs/mqtt-topics.md)
- [Roadmap](docs/roadmap.md)
- [Termux Notes](docs/termux-notes.md)
- [Operations](docs/operations.md)
