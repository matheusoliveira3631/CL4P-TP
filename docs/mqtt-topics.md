# MQTT Topics

## Namespace

All MVP topics are under `cl4ptp/`.

## Topic Registry

- `automationCommand`: `cl4ptp/automation/command`
- `automationEvent`: `cl4ptp/automation/event`
- `sunmiPrintRequest`: `cl4ptp/sunmi/print/request`
- `sunmiPrintStatus`: `cl4ptp/sunmi/print/status`
- `systemStatus`: `cl4ptp/system/status`

## Envelope

Every message uses the same outer shape:

```json
{
  "id": "uuid",
  "type": "automation.command",
  "source": "api|executor|mqtt|internal",
  "timestamp": "2026-03-24T21:00:00.000Z",
  "correlationId": "",
  "version": 1,
  "data": {}
}
```

## Command Payload

`cl4ptp/automation/command` expects:

```json
{
  "action": "scan|refresh|publish|request_print|ping|echo",
  "target": "storage|status|mqtt|sunmi|service|automation",
  "location": "",
  "params": {}
}
```

## SUNMI Scope

For this MVP, SUNMI exists only on the NAS side:

- topic contract
- publish handler
- status observation

There is no POS implementation in this repository.
