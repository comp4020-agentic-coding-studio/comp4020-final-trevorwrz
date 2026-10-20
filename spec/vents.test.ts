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

it("sort=new orders by recency even when a less-resonated vent is newer", async () => {
  const author = jar();
  const older = `sort-older-${crypto.randomUUID()}`;
  const newer = `sort-newer-${crypto.randomUUID()}`;
  await postVent(author, "COMP8020", older);

  const page = await author.fetch("/").then((r) => r.text());
  const match = page.match(new RegExp(`${older}[\\s\\S]*?action="/vents/(\\d+)/resonate"`));
  expect(match, "could not find a resonate form for the older vent").not.toBeNull();
  const olderId = match![1];

  // Give the older vent several resonances so it wins on the default "hot"
  // sort, then post a second, unresonated vent after it — only sort=new
  // should put the newer, less-popular one first.
  for (const visitor of [jar(), jar(), jar()]) {
    await visitor.fetch(`/vents/${olderId}/resonate`, { method: "POST" });
  }
  await postVent(author, "COMP8020", newer);

  const hot = await author.fetch("/").then((r) => r.text());
  expect(hot.indexOf(older), "hot sort should rank the more-resonated vent first").toBeLessThan(hot.indexOf(newer));

  const byNew = await author.fetch("/?sort=new").then((r) => r.text());
  expect(byNew.indexOf(newer), "sort=new should rank the more recent vent first").toBeLessThan(byNew.indexOf(older));
});

it("an unrecognised sort value falls back to the default instead of erroring", async () => {
  const res = await fetch(new URL("/?sort=drop+table+vents", baseUrl));
  expect(res.status).toBe(200);
});

it("a vent body is never rendered as raw HTML", async () => {
  const visitor = jar();
  const marker = crypto.randomUUID();
  await postVent(visitor, "COMP8020", `<script>window.${marker}=1</script>`);

  const page = await visitor.fetch("/").then((r) => r.text());
  expect(page).not.toContain(`<script>window.${marker}=1</script>`);
  expect(page).toContain("&lt;script&gt;");
});
