# Termux Notes

## Baseline Assumptions

- Android phone running Termux
- no root
- no `systemd`
- app may be killed in background by Android

## Storage

- Repo-local directories are the default safe roots.
- Shared storage and OTG roots are opt-in through env vars.
- Expect permissions and latency differences between `$HOME` and shared storage.

## Networking

- API binds to `0.0.0.0` by default in this MVP.
- Mutable routes require a token.
- Embedded MQTT broker binds to `127.0.0.1` by default.

## Optional Operational Helpers

- PM2 for process supervision
- Termux:Boot for startup on boot
- wake locks if the phone aggressively suspends background work

## Honest Constraints

- File Browser is not guaranteed to run in Termux without local validation.
- Jellyfin is not assumed to be viable in this MVP.
- `llama.cpp` is scaffolded as optional; model and binary validation must happen on-device.
