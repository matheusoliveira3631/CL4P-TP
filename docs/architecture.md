# Architecture

## Overview

CL4P-TP is split into transport, orchestration, handlers, and infrastructure:

- `api/`: HTTP transport only.
- `core/`: command routing, execution, status aggregation.
- `handlers/`: concrete automation/system actions.
- `services/`: LLM, MQTT, storage, media, network, status helpers.
- `models/`: shared shapes and validators.

## Main Flow

1. `POST /intent/parse` normalizes text and routes it through the selected intent adapter.
2. `POST /command` accepts either text or an intent object.
3. The command router resolves text into an intent when needed.
4. The automation executor validates that the intent is executable.
5. A registered handler performs the actual side effect.
6. MQTT execution events are emitted when possible.

## Decoupling Rules

- The parser never executes side effects.
- The executor never parses text.
- Storage access always goes through the storage service.
- MQTT topics are centralized in a registry.
- File Browser and Jellyfin are probed passively; they do not block the API.

## Service Status Model

Every service is reported as:

- `up`
- `degraded`
- `down`
- `disabled`

This keeps the status page honest when optional integrations are absent.

## Termux Bias

The design assumes:

- no Docker
- no root
- no `systemd`
- Android/Termux filesystem quirks
- optional external integrations may not be available on-device
