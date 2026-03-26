# API Documentation

This document describes all API endpoints provided by the Log Replayer backend.

## Base URL

```
http://localhost:3001
```

## Health Check

### GET /health

Check if the server is running.

**Response**
```json
{
  "status": "ok"
}
```

## Sessions

### GET /api/sessions

List all sessions.

**Query Parameters**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| limit | number | 100 | Maximum sessions to return |
| offset | number | 0 | Number of sessions to skip |

**Response**
```json
{
  "sessions": [
    {
      "id": "sess-abc123",
      "name": "Production Logs",
      "created_at": "2024-01-15T10:30:00Z",
      "event_count": 1542,
      "start_time": "2024-01-15T10:00:00Z",
      "end_time": "2024-01-15T11:00:00Z",
      "event_types": ["ENTITY_CREATED", "ENTITY_UPDATED", "ERROR"]
    }
  ],
  "total": 1
}
```

### POST /api/sessions/upload

Upload a JSON log file to create a new session.

**Request**
- Content-Type: `multipart/form-data`
- Body: `file` - The JSON log file

**Example**
```bash
curl -X POST http://localhost:3001/api/sessions/upload \
  -F "file=@events.json"
```

**Response**
```json
{
  "session": {
    "id": "sess-xyz789",
    "name": "events.json",
    "created_at": "2024-01-15T12:00:00Z",
    "event_count": 500,
    "start_time": "2024-01-01T00:00:00Z",
    "end_time": "2024-01-01T01:00:00Z",
    "event_types": ["ENTITY_CREATED", "ENTITY_UPDATED"]
  }
}
```

### GET /api/sessions/:id

Get details for a specific session.

**Response**
```json
{
  "session": {
    "id": "sess-abc123",
    "name": "Production Logs",
    "created_at": "2024-01-15T10:30:00Z",
    "event_count": 1542,
    "start_time": "2024-01-15T10:00:00Z",
    "end_time": "2024-01-15T11:00:00Z",
    "event_types": ["ENTITY_CREATED", "ENTITY_UPDATED", "ERROR"]
  }
}
```

### DELETE /api/sessions/:id

Delete a session and all associated events.

**Response**
```json
{
  "success": true
}
```

### PATCH /api/sessions/:id

Update session metadata.

**Request Body**
```json
{
  "name": "New Session Name"
}
```

**Response**
```json
{
  "session": {
    "id": "sess-abc123",
    "name": "New Session Name",
    ...
  }
}
```

### GET /api/sessions/:id/stats

Get statistics for a session.

**Response**
```json
{
  "event_count": 1542,
  "duration_ms": 3600000,
  "event_types": ["ENTITY_CREATED", "ENTITY_UPDATED", "ERROR"]
}
```

### GET /api/sessions/:id/search

Search sessions by name.

**Query Parameters**
| Parameter | Type | Description |
|-----------|------|-------------|
| q | string | Search query |
| limit | number | Maximum results (default: 50) |

**Response**
```json
{
  "sessions": [...],
  "total": 5
}
```

## Events

### GET /api/sessions/:id/events

Get events for a session with optional filtering and pagination.

**Query Parameters**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| limit | number | 100 | Maximum events per page |
| cursor | string | - | Pagination cursor |
| event_type | string | - | Filter by event type |
| start_time | string | - | Filter events after this time |
| end_time | string | - | Filter events before this time |

**Response**
```json
{
  "events": [
    {
      "id": "evt-001",
      "session_id": "sess-abc123",
      "sequence": 1,
      "timestamp": "2024-01-15T10:00:00Z",
      "type": "ENTITY_CREATED",
      "payload": {
        "entityType": "user",
        "entity": { "id": "1", "name": "Alice" }
      },
      "metadata": {
        "source": "api"
      }
    }
  ],
  "next_cursor": "10",
  "has_more": true
}
```

### GET /api/sessions/:id/events/:eventId

Get a specific event.

**Response**
```json
{
  "id": "evt-001",
  "session_id": "sess-abc123",
  "sequence": 1,
  "timestamp": "2024-01-15T10:00:00Z",
  "type": "ENTITY_CREATED",
  "payload": { ... },
  "metadata": { ... }
}
```

### GET /api/sessions/:id/events/range

Get events within a sequence range.

**Query Parameters**
| Parameter | Type | Description |
|-----------|------|-------------|
| start_sequence | number | Start sequence number |
| end_sequence | number | End sequence number |

**Response**
```json
{
  "events": [...]
}
```

### GET /api/sessions/:id/events/search

Search events by payload content.

**Query Parameters**
| Parameter | Type | Description |
|-----------|------|-------------|
| q | string | Search query |

**Response**
```json
{
  "events": [...]
}
```

## Event Types

### GET /api/sessions/:id/event-types

Get all unique event types for a session.

**Response**
```json
{
  "event_types": ["ENTITY_CREATED", "ENTITY_UPDATED", "ENTITY_DELETED", "ERROR"]
}
```

## Snapshots

### GET /api/sessions/:id/snapshots

Get all checkpoint snapshots for a session.

**Response**
```json
{
  "snapshots": [
    { "sequence": 100, "created_at": "2024-01-15T10:01:40Z" },
    { "sequence": 200, "created_at": "2024-01-15T10:03:20Z" }
  ]
}
```

### GET /api/sessions/:id/snapshots/:sequence

Get the state snapshot at a specific sequence.

**Response**
```json
{
  "sequence": 150,
  "state": {
    "entities": {
      "user": {
        "1": { "id": "1", "name": "Alice" },
        "2": { "id": "2", "name": "Bob" }
      }
    }
  },
  "created_at": "2024-01-15T10:02:30Z"
}
```

## Error Responses

All endpoints may return error responses:

### 400 Bad Request
```json
{
  "error": "Validation Error",
  "message": "Invalid request parameters",
  "details": [...]
}
```

### 404 Not Found
```json
{
  "error": "Not Found",
  "message": "Session not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal Server Error",
  "message": "An unexpected error occurred"
}
```

## Rate Limiting

Currently, no rate limiting is implemented. In production, consider adding rate limiting middleware.

## Data Formats

### Timestamps

All timestamps use ISO 8601 format in UTC:
```
2024-01-15T10:30:00Z
```

### UUIDs

Session and event IDs are generated using a timestamp + random string format:
```
1705315800-abc123def4
```

## WebSocket (Future)

Future versions may support WebSocket connections for real-time event streaming. See issue tracking for updates.
