import { expect, inject, it } from "vitest";

const baseUrl = inject("baseUrl");

// Reads Server-Sent Events off a fetch() response body, resolving as soon as
// one full "event:"-prefixed message has arrived, or rejecting after a
// deadline. This is the spec's "within about a second" requirement made
// mechanical: it fails loudly if a change stops reaching open connections at
// all, rather than only being checkable by eye at the crit. The deadline
// below is looser than the brief's "about a second" on purpose — it's
// proving the push mechanism works, not benchmarking latency, and a local
// test run adds its own scheduling noise on top of the real push.
async function nextEvent(stream: ReadableStream<Uint8Array>, deadlineMs: number): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  // A single outstanding reader.read() at a time, cancelled from outside on
  // timeout, rather than racing a fresh read() against a timer each loop:
  // racing re-issues read() on every tick it loses, and a reader only ever
  // has one read pending — two in flight at once is what was actually
  // making this flaky, not the server.
  const timer = setTimeout(() => {
    reader.cancel().catch(() => {});
  }, deadlineMs);

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      if (buffer.includes("event: changed")) return buffer;
    }
  } finally {
    clearTimeout(timer);
  }
  throw new Error(`no "changed" event arrived within ${deadlineMs}ms`);
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
  // already open when someone else posts.
  const stream = await watcher
    .fetch("/events", { headers: { accept: "text/event-stream" } })
    .then((r) => {
      if (!r.body) throw new Error("no readable stream on /events response");
      return r.body;
    });

  const marker = `realtime-${crypto.randomUUID()}`;
  await poster.fetch("/vents", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ course: "COMP8020", body: marker }).toString(),
  });

  await nextEvent(stream, 3_000);

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
  const stream = await watcher
    .fetch("/events", { headers: { accept: "text/event-stream" } })
    .then((r) => {
      if (!r.body) throw new Error("no readable stream on /events response");
      return r.body;
    });

  const resonator = jar();
  await resonator.fetch(`/vents/${ventId}/resonate`, { method: "POST" });

  await nextEvent(stream, 3_000);
});
