# vale-server

An API backend for Vale with Vale at Red Hat rules.


## Endpoints

- GET `/` — Basic info message.
- GET `/health` — Health check, returns `{ status: "ok", uptime, timestamp }`.
- POST `/lint` — Lints text with Vale. Body: `{ "text": "your text" }`.

