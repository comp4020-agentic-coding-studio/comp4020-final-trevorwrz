import express from "express";
import { join } from "node:path";
import { addResonance, createVent, listCourseLeaderboard, listVents } from "./db.ts";
import { renderCourseList, renderCoursesPage, renderPage, renderVentList } from "./views.ts";
import { renderReadme } from "./readme.ts";
import { getOrSetVisitorId } from "./visitor.ts";
import { addClient, broadcastChange, removeClient } from "./events.ts";

const app = express();
app.disable("x-powered-by");
app.use(express.urlencoded({ extended: false }));

const readmePath = join(import.meta.dirname, "..", "README.md");

app.get("/", (req, res) => {
  const visitorId = getOrSetVisitorId(req, res);
  res.type("html").send(renderPage(listVents(visitorId)));
});

app.get("/vents/fragment", (req, res) => {
  const visitorId = getOrSetVisitorId(req, res);
  res.type("html").send(renderVentList(listVents(visitorId)));
});

app.get("/courses", (_req, res) => {
  res.type("html").send(renderCoursesPage(listCourseLeaderboard()));
});

app.get("/courses/fragment", (_req, res) => {
  res.type("html").send(renderCourseList(listCourseLeaderboard()));
});

app.post("/vents", (req, res) => {
  getOrSetVisitorId(req, res);
  const course = String(req.body.course ?? "").trim().replace(/\s+/g, " ").slice(0, 80);
  const body = String(req.body.body ?? "").trim().slice(0, 500);
  if (course && body) {
    createVent(course, body);
    broadcastChange();
  }
  res.redirect(303, "/");
});

app.post("/vents/:id/resonate", (req, res) => {
  const visitorId = getOrSetVisitorId(req, res);
  const ventId = Number(req.params.id);
  if (Number.isInteger(ventId)) {
    addResonance(ventId, visitorId);
    broadcastChange();
  }
  res.redirect(303, "/");
});

// Server-Sent Events: one long-lived connection per open tab, per the
// read-heavy/write-light shape noted in docs/decisions/0001-stack.md. The
// event carries no data (see app/events.ts) — it's just the cue for a
// connected tab to re-fetch its own personalised fragment.
app.get("/events", (req, res) => {
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders();
  res.write("retry: 2000\n\n");
  addClient(res);

  // Fly's proxy (and any intermediary) will close an idle connection; a
  // periodic comment line is invisible to the client's "changed" listener
  // but keeps the stream alive between real updates.
  const heartbeat = setInterval(() => {
    res.write(": heartbeat\n\n");
  }, 15_000);

  req.on("close", () => {
    clearInterval(heartbeat);
    removeClient(res);
  });
});

app.get("/readme/", (_req, res) => {
  res.type("html").send(renderReadme(readmePath));
});

const port = Number(process.env.PORT ?? 8080);
app.listen(port, "0.0.0.0", () => {
  console.log(`listening on 0.0.0.0:${port}`);
});
