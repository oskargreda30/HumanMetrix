---
name: Port 5000 EADDRINUSE hardening
description: Why server/index.ts retries listen() and force-exits on shutdown; do not "simplify" it away.
---

# Preventing EADDRINUSE on port 5000

The single workflow ("Start application") binds port 5000. On restart a stale
previous process can still hold the port for a moment, and an **unhandled**
`server` `'error'` event (EADDRINUSE) crashes the workflow.

**Rule:** `server/index.ts` startup must (a) register a `server.on('error')`
handler that retries `server.listen()` on `EADDRINUSE` instead of throwing, and
(b) shut down fast so the old process never lingers on the port.

**Why:** Node's default is to emit an unhandled `'error'` and exit non-zero when
the port is taken — that is exactly the reported "EADDRINUSE — a restart will
clear it" failure. Graceful shutdown that waits on 65s keep-alive connections or
a 30s force-timeout keeps the old process alive long enough to collide with the
next start.

**How to apply (the current design — keep these properties if you refactor):**
- `server.once('listening', onListening)` + a `startListening()` that calls
  `server.listen({ port, host: '0.0.0.0', reusePort: true })`. Keep `reusePort:
  true` (Replit standard; removing it makes EADDRINUSE *more* likely on restart).
- `server.on('error')`: on `EADDRINUSE`, retry up to 20× at 1s; bail with
  `exit(1)` after the cap; any other error → `exit(1)`. Skip retrying once
  `shuttingDown` is set, and store the retry timer so shutdown can cancel it.
- Graceful shutdown: re-entrancy guard, call `closeIdleConnections()` to drop
  keep-alive idles so `server.close()` resolves promptly, and an **unref'd 8s
  force-exit** that always `process.exit(0)` so the port is released even if
  queues/close hang.
