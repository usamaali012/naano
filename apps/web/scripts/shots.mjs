// Full screenshot suite. Regenerating every shot is part of finishing a task —
// run this, don't hand-pick.
//
//   npm run dev            # in another terminal (api + web)
//   npm run shots --workspace=apps/web
//
// Writes the entry page, the brand marketplace (grid + both modal tabs +
// booking rail), the creator home, and the marketplace error state into
// apps/web/.screenshots/, wiping the folder first so every mtime is from this
// run. Each side signs in for real from the entry page.
import { mkdir, rm, readdir, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { chromium } from "playwright";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(HERE, "..", ".screenshots");
const BASE = process.env.SHOT_BASE_URL ?? "http://localhost:5173";
const API = process.env.VITE_API_URL ?? "http://localhost:3000";
const WIDTH = 1440;

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
const errors = [];

async function newContext(height = 1400) {
  const context = await browser.newContext({ viewport: { width: WIDTH, height } });
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(`${page.url()} :: ${e}`));
  page.on("console", (m) => m.type() === "error" && errors.push(`${page.url()} :: ${m.text()}`));
  return { context, page };
}

async function settleImages(page) {
  await page
    .waitForFunction(() => Array.from(document.images).every((i) => i.complete), null, { timeout: 10_000 })
    .catch(() => {});
  await page.waitForTimeout(400); // let onError fallbacks re-render
}

async function shot(page, name, { fullPage = true } = {}) {
  await settleImages(page);
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage });
}

async function signIn(page, side) {
  const label = side === "brand" ? "Continue as a brand" : "Continue as a creator";
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: label }).click();
  await page.waitForURL("**/app");
  await page.getByRole("button", { name: "Sign out" }).waitFor({ timeout: 8000 });
}

// --- entry page ---------------------------------------------------------------
{
  const { context, page } = await newContext(900);
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.waitForTimeout(300);
  await shot(page, "entry-page");
  await context.close();
}

// --- brand: grid + modal ----------------------------------------------------
{
  const { context, page } = await newContext();
  await signIn(page, "brand");
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
  await context.close();
}

// --- ensure the demo creator (Emma Berg) has a pending invite ---------------
// So creator-booking-requests.png shows an INVITED row with Accept/Decline
// visible. Seed's random status assignment already pairs Emma with every
// campaign her one demo brand (Ledgerly) has, all non-INVITED -- so a normal
// POST /bookings from the UI would always 409. dev/bookings/ensure-invited
// is a no-op if Emma already has an INVITED booking (any campaign), so
// reruns stay stable.
{
  const emmaRes = await fetch(`${API}/creators?q=${encodeURIComponent("Emma Berg")}&pageSize=1`);
  const emma = (await emmaRes.json()).items[0];
  await fetch(`${API}/dev/bookings/ensure-invited`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ creatorProfileId: emma.id }),
  });
}

// --- creator home ---------------------------------------------------------
{
  const { context, page } = await newContext();
  await signIn(page, "creator");
  await page.waitForTimeout(1200);
  await shot(page, "creator-home");

  const requests = page.getByRole("heading", { name: "Your bookings" });
  await requests.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await shot(page, "creator-booking-requests", { fullPage: false });
  await context.close();
}

// --- marketplace error state -------------------------------------------------
{
  const { context, page } = await newContext(900);
  await signIn(page, "brand");
  await page.route(`${API}/creators*`, (r) => r.abort());
  await page.route(`${API}/campaigns/**`, (r) => r.abort());
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Try again" }).waitFor({ timeout: 5000 });
  await page.waitForTimeout(300);
  await shot(page, "error-state");
  await context.close();
}

await browser.close();

const files = (await readdir(OUT)).filter((f) => f.endsWith(".png")).sort();
for (const f of files) {
  const s = await stat(path.join(OUT, f));
  console.log(`${f.padEnd(24)} ${s.mtime.toISOString()}`);
}
console.log(errors.length ? `\nCONSOLE/PAGE ERRORS:\n${errors.join("\n")}` : "\nno console/page errors");
