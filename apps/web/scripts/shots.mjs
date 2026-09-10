// Full marketplace screenshot suite. Regenerating every shot is part of
// finishing a task — run this, don't hand-pick.
//
//   npm run dev            # in another terminal (api + web)
//   npm run shots --workspace=apps/web
//
// Writes grid, both modal tabs, the booking rail (bundle selected), and the
// marketplace error state into apps/web/.screenshots/, wiping the folder first
// so every file's mtime is from this run.
import { mkdir, rm, readdir, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { chromium } from "playwright";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(HERE, "..", ".screenshots");
const BASE = process.env.SHOT_BASE_URL ?? "http://localhost:5173";
const WIDTH = 1440;

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
const errors = [];

async function newPage(height = 1400) {
  const page = await browser.newPage({ viewport: { width: WIDTH, height } });
  page.on("pageerror", (e) => errors.push(`${page.url()} :: ${e}`));
  page.on("console", (m) => m.type() === "error" && errors.push(`${page.url()} :: ${m.text()}`));
  return page;
}

async function shot(page, name) {
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: true });
}

// --- grid + modal ---------------------------------------------------------
{
  const page = await newPage();
  await page.goto(`${BASE}/app`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500); // avatar images
  await shot(page, "creators-grid");

  await page.getByRole("button", { name: "Book", exact: true }).first().click();
  await page.waitForSelector('[role="dialog"]');
  await page.waitForTimeout(900);
  await shot(page, "modal-overview");

  await page.getByText("How pricing is calculated").click();
  await page.getByRole("button", { name: /Bundle of 5/ }).click();
  await page.waitForTimeout(250);
  await shot(page, "modal-rail-bundle");

  await page.getByRole("tab", { name: "Audience" }).click();
  await page.waitForTimeout(350);
  await shot(page, "modal-audience");
  await page.close();
}

// --- marketplace error state -------------------------------------------------
{
  const api = process.env.VITE_API_URL ?? "http://localhost:3000";
  const page = await newPage(900);
  // Fail every API call (only the API origin — Vite assets on :5173 still load)
  // so the shell renders and the marketplace shows its error panel.
  await page.route(`${api}/**`, (r) => r.abort());
  await page.goto(`${BASE}/app`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Try again" }).waitFor({ timeout: 5000 });
  await page.waitForTimeout(300);
  await shot(page, "error-state");
  await page.close();
}

await browser.close();

const files = (await readdir(OUT)).filter((f) => f.endsWith(".png")).sort();
for (const f of files) {
  const s = await stat(path.join(OUT, f));
  console.log(`${f.padEnd(24)} ${s.mtime.toISOString()}`);
}
console.log(errors.length ? `\nCONSOLE/PAGE ERRORS:\n${errors.join("\n")}` : "\nno console/page errors");
