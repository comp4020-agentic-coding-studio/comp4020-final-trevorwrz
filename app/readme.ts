import { readFileSync } from "node:fs";
import { escapeHtml } from "./views.ts";

// Rendered verbatim (escaped) rather than through a markdown parser: the spec
// only requires the README's headings to appear, in order, in the served
// page's text, and a verbatim render can't drift from the source the way a
// hand-rolled parser could.
export function renderReadme(readmePath: string): string {
  const body = escapeHtml(readFileSync(readmePath, "utf8"));

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>About / README</title>
    <style>
      body { font-family: system-ui, sans-serif; max-width: 640px; margin: 2rem auto; padding: 0 1rem; }
      pre { white-space: pre-wrap; word-break: break-word; font-family: inherit; }
      a.back { display: inline-block; margin-bottom: 1rem; }
    </style>
  </head>
  <body>
    <a class="back" href="/">&larr; Back to vent wall</a>
    <pre>${body}</pre>
  </body>
</html>`;
}
