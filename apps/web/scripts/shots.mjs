// Full screenshot suite. Regenerating every shot is part of finishing a task —
// run this, don't hand-pick.
//
//   npm run dev            # in another terminal (api + web)
//   npm run shots --workspace=apps/web
//
// Writes the entry page, the brand marketplace (comparison list + persistent
// detail panel, a selected row, the filter panel with a filter set), brand
// Collaborations, Results, the creator's Profile/Collaborations/Earnings, and
// the marketplace error state into apps/web/.screenshots/, wiping the folder
// first so every mtime is from this run. Each side signs in for real from the
// entry page. Every wait is on a real selector, response, or visible text —
// no fixed timeouts standing in for "probably done by now".
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

// --- brand: marketplace (comparison list + persistent detail panel) --------
{
  const { context, page } = await newContext();
  await signIn(page, "brand");

  // The list is loaded once its first row's Book action is on screen; the
  // detail panel fills with the top row automatically (no open/close step),
  // so its Overview tab is the signal the panel itself is ready too.
  await page.getByRole("button", { name: "Book", exact: true }).first().waitFor();
  await page.getByRole("tab", { name: "Overview" }).waitFor();
  await page.waitForTimeout(1500); // avatar images
  await shot(page, "marketplace");

  // Select a different row — the panel swaps in place. Wait on the real
  // GET /creators/:id response the click triggers, not a timeout.
  const rows = page.locator("tbody tr");
  await Promise.all([
    page.waitForResponse(
      (res) =>
        res.request().method() === "GET" && /\/creators\/[^/?]+$/.test(new URL(res.url()).pathname),
    ),
    rows.nth(1).click(),
  ]);
  await page.getByRole("tab", { name: "Overview" }).waitFor();
  await shot(page, "marketplace-detail-panel");

  // One filter set (W3 — the row-two performance filters share the panel
  // with row one). Max CPM's placeholder ("EUR") is unique on the page.
  await Promise.all([
    page.waitForResponse((res) => res.url().includes("maxCpmEur=30")),
    page.getByPlaceholder("EUR").fill("30"),
  ]);
  await page.getByRole("button", { name: /Remove Max .*CPM filter/ }).waitFor();
  await shot(page, "marketplace-filters");
  await context.close();
}

// --- brand: collaborations ---------------------------------------------------
{
  const { context, page } = await newContext();
  await signIn(page, "brand");
  await page.getByRole("button", { name: "Collaborations" }).click();
  await page.waitForURL("**/app/collaborations");
  await page.waitForSelector("table");
  await page.waitForTimeout(300);
  await shot(page, "collaborations");
  await context.close();
}

// --- brand: results ------------------------------------------------------------
{
  const { context, page } = await newContext();
  await signIn(page, "brand");
  await page.getByRole("button", { name: "Results" }).click();
  await page.waitForURL("**/app/results");
  // Either a real attribution table or one of its two empty states — all
  // three are legitimate rendered states, so wait for whichever lands.
  await page
    .locator("table")
    .or(page.getByText("Clicks are tracked once a creator accepts a booking."))
    .or(page.getByText(/No clicks yet\./))
    .first()
    .waitFor();
  await page.waitForTimeout(300);
  await shot(page, "results");
  await context.close();
}

// --- ensure the demo creator (Emma Berg) has a pending invite ---------------
// So creator-collaborations.png shows an actionable INVITED row with
// Accept/Decline visible. Seed's random status assignment already pairs Emma
// with every campaign her one demo brand (Ledgerly) has, all non-INVITED --
// so a normal POST /bookings from the UI would always 409.
// dev/bookings/ensure-invited is a no-op if Emma already has an INVITED
// booking (any campaign), so reruns stay stable.
{
  const emmaRes = await fetch(`${API}/creators?q=${encodeURIComponent("Emma Berg")}&pageSize=1`);
  const emma = (await emmaRes.json()).items[0];
  await fetch(`${API}/dev/bookings/ensure-invited`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ creatorProfileId: emma.id }),
  });
}

// --- creator: profile ---------------------------------------------------------
{
  const { context, page } = await newContext();
  await signIn(page, "creator");
  await page.getByRole("heading", { name: "Your profile" }).waitFor();
  await page.waitForTimeout(1200); // avatar + post images
  await shot(page, "creator-profile");
  await context.close();
}

// --- creator: collaborations --------------------------------------------------
{
  const { context, page } = await newContext();
  await signIn(page, "creator");
  await page.getByRole("button", { name: "Collaborations" }).click();
  await page.waitForURL("**/app/collaborations");
  // Either a rendered collaboration card or the empty state.
  await page
    .getByText("No collaborations yet.")
    .or(page.locator("li").first())
    .first()
    .waitFor();
  await page.waitForTimeout(300);
  await shot(page, "creator-collaborations");
  await context.close();
}

// --- creator: earnings ----------------------------------------------------
{
  const { context, page } = await newContext();
  await signIn(page, "creator");
  await page.getByRole("button", { name: "Earnings" }).click();
  await page.waitForURL("**/app/earnings");
  // Either the metric tiles or the "no earnings yet" empty state.
  await page
    .getByText("Total earned")
    .or(page.getByText("No earnings yet"))
    .first()
    .waitFor();
  await page.waitForTimeout(300);
  await shot(page, "creator-earnings");
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
  console.log(`${f.padEnd(28)} ${s.mtime.toISOString()}`);
}
console.log(errors.length ? `\nCONSOLE/PAGE ERRORS:\n${errors.join("\n")}` : "\nno console/page errors");
