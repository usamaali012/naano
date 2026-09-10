// Screenshot a route at 1440px width into .screenshots/. This is the "give
// yourself eyes" tool from the build plan: build a screen, shoot it, check it
// against docs/DESIGN.md before moving on.
//
// Usage (from repo root):
//   npm run dev            # in another terminal — the dev server must be up
//   npm run shot --workspace=apps/web -- /app
//   npm run shot --workspace=apps/web -- /app creators-grid
//
// First arg: the route (default "/"). Second arg: output basename (default
// derived from the route). Base URL overridable with SHOT_BASE_URL.
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { chromium } from "playwright";

const WIDTH = 1440;
const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(HERE, "..", ".screenshots");
const BASE_URL = process.env.SHOT_BASE_URL ?? "http://localhost:5173";

const route = process.argv[2] ?? "/";
const name =
  process.argv[3] ??
  (route === "/" ? "home" : route.replace(/^\/+/, "").replace(/[^\w.-]+/g, "-"));

await mkdir(OUT_DIR, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: WIDTH, height: 900 } });

const url = new URL(route, BASE_URL).toString();
const response = await page.goto(url, { waitUntil: "networkidle" });
if (!response || !response.ok()) {
  await browser.close();
  console.error(`shot: ${url} responded ${response ? response.status() : "no response"}`);
  process.exit(1);
}

const outPath = path.join(OUT_DIR, `${name}.png`);
await page.screenshot({ path: outPath, fullPage: true });
await browser.close();

console.log(`shot: ${url} -> ${path.relative(process.cwd(), outPath)} @ ${WIDTH}px`);
