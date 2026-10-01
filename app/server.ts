import express from "express";
import { join } from "node:path";
import { addResonance, createVent, listVents } from "./db.ts";
import { renderPage } from "./views.ts";
import { renderReadme } from "./readme.ts";
import { getOrSetVisitorId } from "./visitor.ts";

const app = express();
app.disable("x-powered-by");
app.use(express.urlencoded({ extended: false }));

const readmePath = join(import.meta.dirname, "..", "README.md");

app.get("/", (req, res) => {
  const visitorId = getOrSetVisitorId(req, res);
  res.type("html").send(renderPage(listVents(visitorId)));
});

app.post("/vents", (req, res) => {
  getOrSetVisitorId(req, res);
  const course = String(req.body.course ?? "").trim().slice(0, 80);
  const body = String(req.body.body ?? "").trim().slice(0, 500);
  if (course && body) createVent(course, body);
  res.redirect(303, "/");
});

app.post("/vents/:id/resonate", (req, res) => {
  const visitorId = getOrSetVisitorId(req, res);
  const ventId = Number(req.params.id);
  if (Number.isInteger(ventId)) addResonance(ventId, visitorId);
  res.redirect(303, "/");
});

app.get("/readme/", (_req, res) => {
  res.type("html").send(renderReadme(readmePath));
});

const port = Number(process.env.PORT ?? 8080);
app.listen(port, "0.0.0.0", () => {
  console.log(`listening on 0.0.0.0:${port}`);
});
