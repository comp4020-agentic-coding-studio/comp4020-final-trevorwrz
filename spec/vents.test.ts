import { expect, inject, it } from "vitest";

const baseUrl = inject("baseUrl");

// A tiny cookie jar: enough to act as "one visitor" across several requests,
// the same way a real browser would.
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

function postVent(visitor: ReturnType<typeof jar>, course: string, body: string) {
  return visitor.fetch("/vents", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ course, body }).toString(),
  });
}

it("a posted vent shows up on the wall", async () => {
  const visitor = jar();
  const marker = `vent-${crypto.randomUUID()}`;
  await postVent(visitor, "COMP8020", marker);

  const page = await visitor.fetch("/").then((r) => r.text());
  expect(page).toContain(marker);
});

it("resonating twice from the same visitor only counts once", async () => {
  const author = jar();
  const marker = `resonate-${crypto.randomUUID()}`;
  await postVent(author, "COMP8020", marker);

  const page = await author.fetch("/").then((r) => r.text());
  const match = page.match(
    new RegExp(`${marker}[\\s\\S]*?action="/vents/(\\d+)/resonate"`),
  );
  expect(match, "could not find a resonate form for the posted vent").not.toBeNull();
  const ventId = match![1];

  const visitor = jar();
  await visitor.fetch(`/vents/${ventId}/resonate`, { method: "POST" });
  await visitor.fetch(`/vents/${ventId}/resonate`, { method: "POST" });

  const after = await visitor.fetch("/").then((r) => r.text());
  const afterMatch = after.match(
    new RegExp(`${marker}</p>[\\s\\S]*?Resonance (\\d+)`),
  );
  expect(afterMatch, "could not find the resonance count after resonating").not.toBeNull();
  expect(Number(afterMatch![1])).toBe(1);
});

it("a vent body is never rendered as raw HTML", async () => {
  const visitor = jar();
  const marker = crypto.randomUUID();
  await postVent(visitor, "COMP8020", `<script>window.${marker}=1</script>`);

  const page = await visitor.fetch("/").then((r) => r.text());
  expect(page).not.toContain(`<script>window.${marker}=1</script>`);
  expect(page).toContain("&lt;script&gt;");
});
