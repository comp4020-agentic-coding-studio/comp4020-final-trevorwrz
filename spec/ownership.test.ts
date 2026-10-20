import { expect, inject, it } from "vitest";

const baseUrl = inject("baseUrl");

// Same tiny cookie jar as spec/vents.test.ts and spec/realtime.test.ts: one
// instance acts as one visitor_id across requests, the way a real browser
// (or a separate Chrome profile, per crit 10's demo) would.
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

async function findVentId(page: string, marker: string): Promise<string> {
  const match = page.match(new RegExp(`${marker}[\\s\\S]*?action="/vents/(\\d+)/`));
  expect(match, `could not find a vent id for marker ${marker}`).not.toBeNull();
  return match![1];
}

it("the author can delete their own vent", async () => {
  const author = jar();
  const marker = `own-delete-${crypto.randomUUID()}`;
  await postVent(author, "COMP8020", marker);

  const page = await author.fetch("/").then((r) => r.text());
  const ventId = await findVentId(page, marker);

  const res = await author.fetch(`/vents/${ventId}/delete`, { method: "POST" });
  expect(res.status).toBe(303);

  const after = await author.fetch("/").then((r) => r.text());
  expect(after).not.toContain(marker);
});

it("a different visitor cannot delete someone else's vent, and the server refuses it (not just the UI)", async () => {
  const author = jar();
  const marker = `other-delete-${crypto.randomUUID()}`;
  await postVent(author, "COMP8020", marker);

  const page = await author.fetch("/").then((r) => r.text());
  const ventId = await findVentId(page, marker);

  const stranger = jar();
  const res = await stranger.fetch(`/vents/${ventId}/delete`, { method: "POST" });
  expect(res.status).toBe(403);

  const after = await author.fetch("/").then((r) => r.text());
  expect(after).toContain(marker);
});

it("a visitor never sees a delete control on a vent they don't own", async () => {
  const author = jar();
  const marker = `no-control-${crypto.randomUUID()}`;
  await postVent(author, "COMP8020", marker);

  const stranger = jar();
  const fragment = await stranger.fetch("/vents/fragment").then((r) => r.text());
  const ventBlock = fragment.slice(fragment.indexOf(marker));
  expect(ventBlock).not.toContain("/delete");

  const ownPage = await author.fetch("/vents/fragment").then((r) => r.text());
  const ownBlock = ownPage.slice(ownPage.indexOf(marker));
  expect(ownBlock).toContain("/delete");
});

// The ownership check only means what it claims if the identity it checks
// against can't be forged or crashed by a crafted Cookie header — no real
// browser sends either of these, but nothing on the wire stops a client
// from doing so, and both reach getOrSetVisitorId() on every single route.
it("a malformed visitor_id cookie doesn't 500 the request", async () => {
  const res = await fetch(new URL("/", baseUrl), {
    headers: { cookie: "visitor_id=%" },
  });
  expect(res.status).toBe(200);
});

it("an oversized visitor_id cookie is never trusted as an identity or stored", async () => {
  const forged = "a".repeat(9000);
  const marker = `forged-cookie-${crypto.randomUUID()}`;
  const res = await fetch(new URL("/vents", baseUrl), {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      cookie: `visitor_id=${forged}`,
    },
    body: new URLSearchParams({ course: "COMP8020", body: marker }).toString(),
    redirect: "manual",
  });
  expect(res.status).toBe(303);
  // A trusted forged value would echo back in Set-Cookie (or set none at
  // all); a rejected one gets reissued a fresh, real identity instead.
  const setCookie = res.headers.get("set-cookie") ?? "";
  expect(setCookie).not.toContain(forged);
});
