import { expect, inject, it } from "vitest";

const baseUrl = inject("baseUrl");

// Reads Server-Sent Events off an already-open reader, resolving as soon as
// a chunk matching `want` has arrived (checked against everything read so
// far, including anything left over from a previous call), or rejecting
// after a deadline. A single outstanding reader.read() at a time, cancelled
// from outside on timeout, rather than racing a fresh read() against a timer
// each loop: racing re-issues read() on every tick it loses, and a reader
// only ever has one read pending — two in flight at once is what was
// actually making this flaky, not the server.
async function readUntil(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  decoder: TextDecoder,
  leftover: string,
  want: string,
  deadlineMs: number,
): Promise<string> {
  let buffer = leftover;
  if (buffer.includes(want)) return buffer;

  const timer = setTimeout(() => {
    reader.cancel().catch(() => {});
  }, deadlineMs);

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      if (buffer.includes(want)) return buffer;
    }
  } finally {
    clearTimeout(timer);
  }
  throw new Error(`"${want}" did not arrive within ${deadlineMs}ms`);
}

// Opens the SSE connection and waits for the preamble line the server writes
// immediately after registering the client (see app/server.ts's "/events"
// handler). Only once that's back is the connection actually registered to
// receive a broadcast — over a real network (the live Fly deploy, not just
// localhost), `fetch()` resolving with headers can land slightly before the
// server's own addClient() call has happened, which raced against an action
// triggered right after was the source of this spec's flakiness against a
// deployed instance.
async function openEventStream(watcher: ReturnType<typeof jar>): Promise<{
  reader: ReadableStreamDefaultReader<Uint8Array>;
  decoder: TextDecoder;
  leftover: string;
}> {
  const body = await watcher
    .fetch("/events", { headers: { accept: "text/event-stream" } })
    .then((r) => {
      if (!r.body) throw new Error("no readable stream on /events response");
      return r.body;
    });
  const reader = body.getReader();
  const decoder = new TextDecoder();
  const leftover = await readUntil(reader, decoder, "", "retry:", 3_000);
  return { reader, decoder, leftover };
}

function jar() {
  let cookie = "";
  return {
    async fetch(path: string, init: RequestInit = {}): Promise<Response> {
      const res = await fetch(new URL(path, baseUrl), {
        ...init,
        headers: { ...init.headers, cookie },
        redirect: "manual",
      });
      const setCookie = res.headers.get("set-cookie");
      if (setCookie) cookie = setCookie.split(";")[0];
      return res;
    },
  };
}

it("a vent posted by one visitor reaches another visitor's open session within about a second, with no reload", async () => {
  const poster = jar();
  const watcher = jar();

  // Establish the watcher's SSE connection first, same as a tab that was
  // already open when someone else posts — and wait for it to actually be
  // registered server-side before triggering anything.
  const { reader, decoder, leftover } = await openEventStream(watcher);

  const marker = `realtime-${crypto.randomUUID()}`;
  await poster.fetch("/vents", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ course: "COMP8020", body: marker }).toString(),
  });

  await readUntil(reader, decoder, leftover, "event: changed", 3_000);

  // The event itself carries no data; the watcher's own next step would be
  // to re-fetch their personalised fragment, which this confirms reflects
  // the new vent without the watcher ever reloading "/".
  const fragment = await watcher
    .fetch("/vents/fragment")
    .then((r) => r.text());
  expect(fragment).toContain(marker);
});

it("resonating a vent broadcasts to other open sessions too, not just new vents", async () => {
  const author = jar();
  const marker = `resonate-live-${crypto.randomUUID()}`;
  await author.fetch("/vents", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ course: "COMP8020", body: marker }).toString(),
  });
  const page = await author.fetch("/").then((r) => r.text());
  const match = page.match(
    new RegExp(`${marker}[\\s\\S]*?action="/vents/(\\d+)/resonate"`),
  );
  expect(match, "could not find a resonate form for the posted vent").not.toBeNull();
  const ventId = match![1];

  const watcher = jar();
  const { reader, decoder, leftover } = await openEventStream(watcher);

  const resonator = jar();
  await resonator.fetch(`/vents/${ventId}/resonate`, { method: "POST" });

  await readUntil(reader, decoder, leftover, "event: changed", 3_000);
});

it("a new vent updates the course leaderboard live too, off the same broadcast", async () => {
  const poster = jar();
  const watcher = jar();
  const { reader, decoder, leftover } = await openEventStream(watcher);

  // Uppercase suffix to match the app's course-name normalisation (see
  // app/db.ts) — the leaderboard fragment never renders mixed case.
  const course = `LIVECOURSE${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  await poster.fetch("/vents", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ course, body: `leaderboard push ${crypto.randomUUID()}` }).toString(),
  });

  await readUntil(reader, decoder, leftover, "event: changed", 3_000);

  // The leaderboard has no per-visitor state to personalise, unlike the
  // wall's own fragment — same broadcast, same "changed" ping, just a
  // different fragment endpoint reacting to it.
  const fragment = await watcher.fetch("/courses/fragment").then((r) => r.text());
  expect(fragment).toContain(course);
});
