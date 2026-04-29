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

The CL4P-TP API publishes print requests to:

`cl4ptp/sunmi/print/request`

Request payloads use the standard envelope with type `sunmi.print.request`:

```json
{
  "id": "uuid",
  "type": "sunmi.print.request",
  "source": "api",
  "timestamp": "2026-03-24T21:00:00.000Z",
  "correlationId": "request-id",
  "version": 1,
  "data": {
    "jobType": "text",
    "content": "Texto para imprimir",
    "copies": 1,
    "meta": {
      "origin": "cl4ptp",
      "source": "api"
    }
  }
}
```

The SUNMI printer app publishes print lifecycle events to:

`cl4ptp/sunmi/print/status`

Status payloads use the standard envelope with type `sunmi.print.status`:

```json
{
  "id": "uuid",
  "type": "sunmi.print.status",
  "source": "sunmi-p2-printer-mvp",
  "timestamp": "2026-03-24T21:00:00.000Z",
  "correlationId": "print-job-id",
  "version": 1,
  "data": {
    "jobId": "print-job-id",
    "status": "queued|printing|completed|failed",
    "message": "Print job completed.",
    "error": ""
  }
}
```

The API subscribes to this status topic and stores the latest event in `runtime.mqtt.lastSunmiStatus`.
