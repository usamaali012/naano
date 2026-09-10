#!/usr/bin/env node
// Pre-submission "is it still up" check against a deployed API.
//
// Usage:
//   node scripts/smoke.mjs <api-base-url>
//   node scripts/smoke.mjs https://naano-api-production.up.railway.app
//
// No dependencies (Node 18+ `fetch`). Prints one PASS/FAIL line per check,
// in order, and exits non-zero if any check failed.
//
// Seeded account emails/password come from apps/api/prisma/seed.ts (not
// hardcoded blind — read from there): every seeded user shares
// `bcrypt.hash("password123", 10)`. The COMPANY account is one of the two
// fixed `companyDefs` entries. The CREATOR account is `buildCreator(0)`'s
// deterministic email — index 0 always maps to FIRST_NAMES[0] "Emma" x
// LAST_NAMES[0] "Berg" via `${first}.${last}${index}@creators.naano.dev`,
// regardless of the randomised fields (tier, country, ...) buildCreator also
// assigns. See seed.ts for both.

const baseArg = process.argv[2];
if (!baseArg) {
  console.error("Usage: node scripts/smoke.mjs <api-base-url>");
  process.exit(1);
}
const base = baseArg.replace(/\/+$/, "");

const SEED_PASSWORD = "password123";
const BRAND_EMAIL = "ops@vertice-analytics.example.com"; // Vertice Analytics, role COMPANY
const CREATOR_EMAIL = "emma.berg0@creators.naano.dev"; // buildCreator(0), role CREATOR

let failures = 0;

function pass(label) {
  console.log(`PASS  ${label}`);
}

function fail(label, detail) {
  failures += 1;
  console.log(`FAIL  ${label}${detail ? ` — ${detail}` : ""}`);
}

async function call(path, init) {
  const res = await fetch(`${base}${path}`, init);
  let body;
  try {
    body = await res.json();
  } catch {
    body = undefined;
  }
  return { status: res.status, body };
}

async function checkHealth() {
  const label = "GET /health -> 200";
  try {
    const { status } = await call("/health");
    if (status === 200) pass(label);
    else fail(label, `got ${status}`);
  } catch (err) {
    fail(label, err.message);
  }
}

async function checkCreatorsCount() {
  const label = "GET /creators -> 200, exactly 40 creators";
  try {
    // pageSize=100 so the envelope's own count isn't hidden behind pagination.
    const { status, body } = await call("/creators?pageSize=100");
    if (status !== 200) return fail(label, `got ${status}`);
    if (body?.total === 40) pass(label);
    else fail(label, `total=${body?.total}, items=${body?.items?.length}`);
  } catch (err) {
    fail(label, err.message);
  }
}

async function login(email, roleLabel) {
  const label = `POST /auth/login (${roleLabel}) -> token`;
  try {
    const { status, body } = await call("/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password: SEED_PASSWORD }),
    });
    if ((status === 200 || status === 201) && body?.accessToken) {
      pass(label);
      return body.accessToken;
    }
    fail(label, `got ${status}${body?.accessToken ? "" : ", no accessToken in body"}`);
    return null;
  } catch (err) {
    fail(label, err.message);
    return null;
  }
}

async function me(token, roleLabel) {
  const label = `GET /auth/me (${roleLabel}) -> 200`;
  if (!token) return fail(label, "skipped, no token from login");
  try {
    const { status } = await call("/auth/me", {
      headers: { authorization: `Bearer ${token}` },
    });
    if (status === 200) pass(label);
    else fail(label, `got ${status}`);
  } catch (err) {
    fail(label, err.message);
  }
}

async function checkDevGuardOff() {
  const label = "GET /dev/tracked-links -> 404 (production mode)";
  try {
    const { status } = await call("/dev/tracked-links");
    if (status === 404) pass(label);
    else fail(label, `got ${status}`);
  } catch (err) {
    fail(label, err.message);
  }
}

async function main() {
  console.log(`Smoke testing ${base}\n`);

  await checkHealth();
  await checkCreatorsCount();

  const brandToken = await login(BRAND_EMAIL, "brand");
  await me(brandToken, "brand");

  const creatorToken = await login(CREATOR_EMAIL, "creator");
  await me(creatorToken, "creator");

  await checkDevGuardOff();

  console.log(`\n${failures === 0 ? "All checks passed." : `${failures} check(s) failed.`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main();
