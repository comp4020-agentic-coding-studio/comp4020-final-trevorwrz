import type { Response } from "express";

// All change broadcasting lives here, separate from the SQLite layer in
// db.ts: db.ts stays a pure data module, this is the fan-out of "something
// changed" to every open tab. One process, one in-memory Set — see
// docs/decisions/0002-presence-and-broadcast-scope.md for why that's enough
// for this app's single-machine deploy shape (same assumption app/db.ts
// already makes about SQLite being single-writer).
const clients = new Set<Response>();

export function addClient(res: Response): void {
  clients.add(res);
}

export function removeClient(res: Response): void {
  clients.delete(res);
}

// Deliberately a bare "something changed" ping, not a payload: every visitor
// needs their own resonatedByVisitor state recomputed, which a broadcast
// can't carry per-recipient. Clients react by re-fetching their own
// personalised fragment (GET /vents/fragment) rather than trusting a
// snapshot pushed over the wire.
export function broadcastChange(): void {
  for (const res of clients) {
    // A client whose connection reset without the server's "close" handler
    // having fired yet (common right after a tab closes or a test cancels
    // its reader) throws here. One dead client must never stop the rest of
    // the Set from being written to, so this is caught and the client is
    // dropped rather than left to abort the whole broadcast.
    try {
      res.write("event: changed\ndata: {}\n\n");
    } catch {
      removeClient(res);
    }
  }
}
