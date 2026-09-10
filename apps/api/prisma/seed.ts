import { randomBytes } from "node:crypto";
import {
  PrismaClient,
  Vertical,
  Network,
  CampaignStatus,
  BookingStatus,
  BookingInitiator,
  PayoutStatus,
  AudienceDimension,
} from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function pick<T>(items: readonly T[]): T {
  const item = items[randomInt(0, items.length - 1)];
  if (item === undefined) throw new Error("pick from empty array");
  return item;
}

function nth<T>(items: readonly T[], index: number): T {
  const item = items[index];
  if (item === undefined) throw new Error(`index ${index} out of range`);
  return item;
}

function shuffled<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = randomInt(0, i);
    const a = nth(copy, i);
    const b = nth(copy, j);
    copy[i] = b;
    copy[j] = a;
  }
  return copy;
}

function randomDateWithinLastDays(days: number): Date {
  const now = Date.now();
  const past = now - randomInt(0, days * 24 * 60 * 60 * 1000);
  return new Date(past);
}

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function fakeHash(): string {
  return randomBytes(32).toString("hex");
}

// A figure derived from a clean ratio (followers x pct, views x rate) reads as
// generated: it lands on round or self-similar numbers (185,185 / 55,556 /
// 70,001). `looksTooClean` spots those shapes; `messy` jitters a computed value
// by a few percent and nudges it off any tell. Prices are exempt — real rate
// cards do cluster on round-ish numbers — so post cost is never run through this.
function looksTooClean(n: number): boolean {
  const s = Math.abs(Math.trunc(n)).toString();
  if (/(\d)\1\1/.test(s)) return true; // any run of 3+ identical digits (000, 555)
  if (n >= 1000 && s.endsWith("00")) return true; // ...00 on a big number
  if (s.endsWith("001")) return true; // ...001
  if (s.length >= 4 && s.length % 2 === 0 && s.slice(0, s.length / 2) === s.slice(s.length / 2)) {
    return true; // repeated half: 185185, 5252
  }
  return false;
}

function messy(value: number, jitterPct = 0.05, floor = 1): number {
  let n = Math.round(value * (1 + randomFloat(-jitterPct, jitterPct)));
  for (let guard = 0; guard < 60 && looksTooClean(n); guard++) {
    n += randomInt(1, 12) * (Math.random() < 0.5 ? -1 : 1);
  }
  return Math.max(floor, n);
}

/**
 * Four positive integers that sum to exactly 100, sorted descending, none below
 * `min`. Used for every audience dimension: four segments, each dimension sums
 * to 100.
 */
function splitToHundredDesc(min = 9): number[] {
  const weights = [
    randomFloat(0.4, 1),
    randomFloat(0.3, 0.9),
    randomFloat(0.2, 0.7),
    randomFloat(0.1, 0.5),
  ];
  const sum = weights.reduce((a, b) => a + b, 0);
  let parts = weights.map((w) => Math.max(min, Math.round((w / sum) * 100)));
  // Reconcile rounding + the min floor against the largest bucket.
  let drift = parts.reduce((a, b) => a + b, 0) - 100;
  while (drift !== 0) {
    const idx = drift > 0 ? parts.indexOf(Math.max(...parts)) : parts.indexOf(Math.min(...parts));
    parts[idx] = nth(parts, idx) + (drift > 0 ? -1 : 1);
    drift = parts.reduce((a, b) => a + b, 0) - 100;
  }
  return parts.sort((a, b) => b - a);
}

const VERTICALS: Vertical[] = [
  Vertical.SALES,
  Vertical.REVOPS,
  Vertical.DEVTOOLS,
  Vertical.HR_TECH,
  Vertical.PRODUCT,
  Vertical.MARKETING_OPS,
  Vertical.FINTECH,
  Vertical.VERTICAL_SAAS,
];

const COUNTRIES = ["US", "GB", "DE", "FR", "NL", "ES", "IT", "SE", "IE", "CA", "AU", "IN", "BR", "PL", "PT"];
const LANGUAGES_BY_COUNTRY: Record<string, string> = {
  US: "en", GB: "en", DE: "de", FR: "fr", NL: "en", ES: "es", IT: "it", SE: "en",
  IE: "en", CA: "en", AU: "en", IN: "en", BR: "pt", PL: "en", PT: "pt",
};

// Country code -> display name. Audience geography is reported as named
// countries, with "Other" absorbing the tail — never a mix of countries and
// regions.
const COUNTRY_NAME: Record<string, string> = {
  US: "United States", GB: "United Kingdom", DE: "Germany", FR: "France",
  NL: "Netherlands", ES: "Spain", IT: "Italy", SE: "Sweden", IE: "Ireland",
  CA: "Canada", AU: "Australia", IN: "India", BR: "Brazil", PL: "Poland", PT: "Portugal",
};

// Named countries a B2B LinkedIn audience most often skews toward, used to fill
// the two non-home geography slots.
const GEO_FILLER_COUNTRIES = [
  "United States", "United Kingdom", "Germany", "France", "Netherlands", "Canada", "Sweden",
];

const FIRST_NAMES = [
  "Emma", "Liam", "Olivia", "Noah", "Ava", "Lucas", "Sophie", "Mateo", "Isabella", "Finn",
  "Mia", "Elias", "Charlotte", "Hugo", "Amelia", "Leon", "Freya", "Nils", "Clara", "Theo",
  "Laura", "Marco", "Nora", "Sven", "Julia", "Jonas", "Elin", "Rafael", "Ines", "Erik",
  "Zoe", "Adam", "Lena", "Victor", "Maya", "Karl", "Alicia", "Sam", "Ruby", "Otto",
];
const LAST_NAMES = [
  "Berg", "Novak", "Fischer", "Rossi", "Dubois", "Andersen", "Silva", "Kowalski",
  "Meyer", "Lund", "Garcia", "Weber", "Larsen", "Moreau", "Conti", "Schmidt",
  "Costa", "Nilsson", "Keller", "Haas", "Petit", "Romano", "Becker", "Sorensen",
];

const VERTICAL_HEADLINES: Record<Vertical, string[]> = {
  SALES: [
    "Helping B2B sales teams hit quota without the endless grind",
    "Outbound that books meetings — frameworks, not spray and pray",
    "Ex-AE turned founder, writing about closing enterprise deals",
    "Cold email teardowns and discovery scripts that actually convert",
    "Building a repeatable sales motion from first hire to first $1M",
    "Sales leadership notes: coaching reps, not babysitting dashboards",
    "Negotiation and pricing tactics for six-figure B2B contracts",
    "From SDR to CRO — the plays that moved real pipeline",
  ],
  REVOPS: [
    "RevOps systems that keep GTM data honest",
    "Pipeline hygiene, forecasting, and the CRM cleanup nobody wants",
    "Turning Salesforce chaos into a forecast leadership trusts",
    "Connecting marketing, sales and CS data so the numbers agree",
    "RevOps for Series A to C: process design without the bloat",
    "Attribution, routing and lead lifecycle — the plumbing of GTM",
    "Building the revenue engine: tooling, process, clean handoffs",
    "Quota capacity models and territory planning that hold up",
  ],
  DEVTOOLS: [
    "Writing for developers who hate being marketed to",
    "Dev tooling reviews from someone who still ships code on Fridays",
    "Developer advocate turning changelogs into things people read",
    "API design, DX, and docs that don't make engineers rage-quit",
    "Benchmarking build tools so your platform team doesn't have to",
    "Open source maintainer writing about the boring parts of infra",
    "From CLI to CI: practical guides for platform engineering",
    "Show, don't tell — demos and code walkthroughs for dev products",
  ],
  HR_TECH: [
    "People ops and HR tech for teams that outgrew spreadsheets",
    "Making HRIS and ATS decisions less painful for scaling teams",
    "Talent acquisition leader writing about hiring without the theatre",
    "Compensation bands, leveling, and pay transparency in practice",
    "Onboarding that sticks — the first 90 days, done properly",
    "HR analytics: headcount, attrition, and what the board asks for",
    "Building people programs at 50, 200, and 1,000 employees",
    "Benefits, compliance, and global hiring for distributed teams",
  ],
  PRODUCT: [
    "Product management lessons from the trenches, not the textbook",
    "PM frameworks that survive contact with real customers",
    "Discovery, roadmaps, and saying no without burning bridges",
    "From feature factory to outcome-driven — a slow, honest rebuild",
    "Ex-PM at two unicorns, writing about prioritization under pressure",
    "Shipping B2B products: pricing, packaging, and the messy middle",
    "Product-led growth for teams that still run a sales motion",
    "Metrics that matter: activation, retention, and the north-star trap",
  ],
  MARKETING_OPS: [
    "MarketingOps and lifecycle automation nerd",
    "Making your martech stack actually talk to each other",
    "Lead scoring, nurture flows, and the data model behind them",
    "Marketo and HubSpot cleanup for teams drowning in workflows",
    "Campaign operations: from brief to attribution, end to end",
    "The ops behind demand gen — routing, enrichment, dedupe",
    "Building a reporting layer marketing and finance both trust",
    "Automation without the spaghetti: governance for growing teams",
  ],
  FINTECH: [
    "Fintech and embedded finance, explained without the jargon",
    "Payments infrastructure for builders",
    "Ex-bank, writing about compliance that doesn't kill velocity",
    "Card issuing, ledgers, and reconciliation for product teams",
    "Embedded lending: risk, underwriting, and unit economics",
    "How money actually moves — rails, settlement, and edge cases",
    "KYC, fraud, and trust infrastructure for early-stage fintech",
    "Treasury and banking-as-a-service from a practitioner's desk",
  ],
  VERTICAL_SAAS: [
    "Vertical SaaS go-to-market playbooks",
    "Niche software, real distribution — lessons from unsexy markets",
    "Building software for industries that still run on paper",
    "Vertical SaaS pricing: seats, usage, and payments upside",
    "Category creation in markets nobody thinks to Google",
    "From point solution to system of record inside a vertical",
    "Selling to SMBs in healthcare, construction, and logistics",
    "Embedded payments and fintech attach for vertical platforms",
  ],
};

// --- Follower tiers ------------------------------------------------------------
// Non-overlapping follower bands. Median views is a share of followers that
// shrinks as the audience grows; the share stays inside the 20-100% window from
// docs/RECON.md §10. Target CPM is drawn in the EUR 10-30 band and post cost is
// derived from it (cost = cpm * medianViews / 1000), then clamped to EUR 20-1,500.
const TIER_BANDS = [
  { followerMin: 1_000, followerMax: 10_000, viewsPctMin: 68, viewsPctMax: 100, cpmMin: 16, cpmMax: 30 },
  { followerMin: 10_000, followerMax: 50_000, viewsPctMin: 46, viewsPctMax: 80, cpmMin: 13, cpmMax: 26 },
  { followerMin: 50_000, followerMax: 150_000, viewsPctMin: 30, viewsPctMax: 55, cpmMin: 11, cpmMax: 22 },
  { followerMin: 150_000, followerMax: 480_000, viewsPctMin: 20, viewsPctMax: 32, cpmMin: 10, cpmMax: 18 },
] as const;

// Engaged-profile sample size per tier — the "estimated from N recent public
// engagers" caption. Sums across 40 creators to roughly 7,300.
const ENGAGER_RANGE: ReadonlyArray<readonly [number, number]> = [
  [34, 92],
  [118, 234],
  [255, 420],
  [420, 640],
];

// Scarce verticals command a CPM premium at the same reach.
const SCARCE_VERTICALS = new Set<Vertical>([Vertical.DEVTOOLS, Vertical.FINTECH, Vertical.REVOPS]);

function tierIndexFromRoll(roll: number): number {
  if (roll < 0.4) return 0;
  if (roll < 0.75) return 1;
  if (roll < 0.93) return 2;
  return 3;
}

const CLAMP_COST_MIN_EUR = 20;
const CLAMP_COST_MAX_EUR = 1_500;

interface CreatorSeed {
  displayName: string;
  email: string;
  vertical: Vertical;
  network: Network;
  crossPosts: boolean;
  followerCount: number;
  medianViews: number;
  postCostCents: number;
  bundle5PriceCents: number;
  observedEngagerCount: number;
  postsAnalyzed: number;
  country: string;
  language: string;
  engagementRate: number;
  headline: string;
}

function buildCreator(index: number): CreatorSeed {
  const first = nth(FIRST_NAMES, index);
  const last = nth(LAST_NAMES, index % LAST_NAMES.length);
  const displayName = `${first} ${last}`;
  const vertical = nth(VERTICALS, index % VERTICALS.length);
  const rankWithinVertical = Math.floor(index / VERTICALS.length);
  const country = pick(COUNTRIES);
  const language = LANGUAGES_BY_COUNTRY[country] ?? "en";

  const tierIndex = tierIndexFromRoll(Math.random());
  const band = nth(TIER_BANDS, tierIndex);
  const followerCount = messy(randomInt(band.followerMin, band.followerMax), 0.02);
  // Median views as a share of followers, then jittered off the clean ratio and
  // clamped back inside the 20-100% window from docs/RECON.md §10.
  const viewsRatio = randomInt(band.viewsPctMin, band.viewsPctMax) / 100;
  const medianViews = Math.min(
    Math.round(followerCount * 0.99),
    Math.max(Math.round(followerCount * 0.21), messy(followerCount * viewsRatio, 0.06)),
  );

  // Post cost is derived from the jittered median views so CPM stays in band.
  // It is NOT run through messy(): real rate cards cluster on round-ish numbers.
  let targetCpmEur = randomFloat(band.cpmMin, band.cpmMax);
  if (SCARCE_VERTICALS.has(vertical)) targetCpmEur = Math.min(30, targetCpmEur + randomFloat(2, 5));
  const rawCostEur = (targetCpmEur * medianViews) / 1000;
  const postCostEur = Math.round(Math.min(CLAMP_COST_MAX_EUR, Math.max(CLAMP_COST_MIN_EUR, rawCostEur)));
  const postCostCents = postCostEur * 100;
  const bundle5PriceCents = Math.round(postCostCents * randomFloat(3.15, 3.45));

  const [engMin, engMax] = nth(ENGAGER_RANGE, tierIndex);
  const observedEngagerCount = messy(randomInt(engMin, engMax), 0.04);

  // network: ~15% are primarily on X; a further ~20% of the rest also post on
  // the other network (crossPosts). Most creators are LinkedIn-only.
  const netRoll = Math.random();
  const network = netRoll < 0.15 ? Network.X : Network.LINKEDIN;
  const crossPosts = netRoll >= 0.15 && netRoll < 0.35;

  return {
    displayName,
    email: `${first.toLowerCase()}.${last.toLowerCase()}${index}@creators.naano.dev`,
    vertical,
    network,
    crossPosts,
    followerCount,
    medianViews,
    postCostCents,
    bundle5PriceCents,
    observedEngagerCount,
    postsAnalyzed: randomInt(14, 30),
    country,
    language,
    engagementRate: randomInt(150, 800) / 10000,
    headline: nth(VERTICAL_HEADLINES[vertical], rankWithinVertical),
  };
}

// --- Audience segment label pools -------------------------------------------
const JOB_TITLE_LABELS = [
  "Founders & CEOs", "VP Sales", "Sales managers", "Account executives",
  "RevOps & Sales Ops", "Marketing leaders", "Product managers",
  "Engineering leaders", "People & HR leaders", "Finance leaders",
  "Customer Success leads", "Operations leaders",
];
const SENIORITY_LABELS = ["C-level", "VP", "Director", "Manager", "Senior IC", "Individual contributor"];
const INDUSTRY_LABELS = [
  "B2B SaaS", "Fintech", "E-commerce & retail", "Agencies & consulting",
  "Manufacturing", "Healthcare", "Professional services", "Media & publishing", "Logistics",
];

// Job titles the creator's own vertical over-indexes on, listed first so they
// tend to be the larger segments.
const VERTICAL_JOB_BIAS: Record<Vertical, string[]> = {
  SALES: ["VP Sales", "Sales managers", "Account executives"],
  REVOPS: ["RevOps & Sales Ops", "VP Sales", "Operations leaders"],
  DEVTOOLS: ["Engineering leaders", "Product managers", "Founders & CEOs"],
  HR_TECH: ["People & HR leaders", "Operations leaders", "Finance leaders"],
  PRODUCT: ["Product managers", "Engineering leaders", "Founders & CEOs"],
  MARKETING_OPS: ["Marketing leaders", "RevOps & Sales Ops", "Operations leaders"],
  FINTECH: ["Finance leaders", "Product managers", "Founders & CEOs"],
  VERTICAL_SAAS: ["Founders & CEOs", "Product managers", "Operations leaders"],
};

function segmentLabels(dimension: AudienceDimension, creator: CreatorSeed): string[] {
  if (dimension === AudienceDimension.SENIORITY) {
    return shuffled(SENIORITY_LABELS).slice(0, 4);
  }
  if (dimension === AudienceDimension.INDUSTRY) {
    return shuffled(INDUSTRY_LABELS).slice(0, 4);
  }
  if (dimension === AudienceDimension.GEOGRAPHY) {
    // Three named countries plus "Other" as the tail. Home country leads.
    const home = COUNTRY_NAME[creator.country] ?? "United States";
    const filler = shuffled(GEO_FILLER_COUNTRIES.filter((g) => g !== home)).slice(0, 2);
    return [home, ...filler, "Other"];
  }
  // JOB_TITLE — lead with the vertical's biased titles, fill from the pool.
  const biased = VERTICAL_JOB_BIAS[creator.vertical];
  const filler = shuffled(JOB_TITLE_LABELS.filter((l) => !biased.includes(l)));
  return [...biased, ...filler].slice(0, 4);
}

// --- Creator post content ---------------------------------------------------
// Posts are written to the creator's vertical from four pools of concrete
// nouns (roles, tools, metrics, situations) filled into shape templates with
// varied openings and lengths. Rules: no ellipses; never "in this space" /
// "the obvious answer" / "teams make this mistake"; every post names something
// concrete; a creator's five posts use five different shapes. The pool of
// possible strings per vertical is in the thousands, and `usedPosts` guards
// global uniqueness across all 200 seeded posts.
interface VerticalVoice {
  roles: string[];
  tools: string[];
  metrics: string[];
  scenes: string[];
  takes: string[];
}

const VOICE: Record<Vertical, VerticalVoice> = {
  SALES: {
    roles: ["an SDR three months in", "a first-time AE", "a VP of Sales", "a founder still closing every deal", "a sales manager", "an enablement lead"],
    tools: ["the discovery call", "a nine-step outbound cadence", "the MEDDPICC fields", "the mutual action plan", "the CRM stage definitions", "the weekly deal review"],
    metrics: ["a 2.1% reply rate", "a 34% win rate on stage-three deals", "an 11-day slip in the sales cycle", "180k of pipeline that slipped a quarter", "six no-shows in one week", "a 19% gap between forecast and close"],
    scenes: ["a Series B sales team", "a two-rep startup", "a 40-person sales org mid-reorg", "a team that just lost its top closer", "a pipeline built entirely on referrals", "an outbound team hired faster than it was trained"],
    takes: ["Most sales coaching is deal inspection wearing a nicer name.", "A meeting booked off a cold call is worth three off a webinar.", "If a rep can't explain how their champion gets promoted, it is not a real deal yet."],
  },
  REVOPS: {
    roles: ["a RevOps manager", "a Salesforce admin", "a GTM data analyst", "a brand-new CRO", "a deal desk lead", "the first ops hire"],
    tools: ["the lead routing rules", "a 14-field opportunity form", "the forecast rollup", "the territory model", "the CPQ config", "attribution in the CRM"],
    metrics: ["a 22% rate of duplicate accounts", "nine hours a week of manual cleanup", "a forecast that came in 12% light", "31% of closed deals missing a reason", "a three-day lag on inbound follow-up", "a four-way split on what qualified means"],
    scenes: ["a company merging two Salesforce instances", "a 60-rep org with no territory model", "a board meeting where the numbers didn't tie out", "a team that had renamed every stage twice in a year", "a GTM org where marketing and sales reported different revenue"],
    takes: ["Nobody volunteers for the CRM cleanup, and it is still the highest-ROI project on the board.", "A forecast leadership trusts beats an accurate one they argue with.", "Every field you make required is a tax you charge your reps forever."],
  },
  DEVTOOLS: {
    roles: ["a platform engineer", "a staff engineer", "an SRE on call", "a backend team lead", "a developer advocate", "an engineer running a vendor eval"],
    tools: ["the CI pipeline", "a Terraform module", "the SDK's retry logic", "webhook delivery", "the CLI auth flow", "the OpenAPI spec"],
    metrics: ["a 40-minute build", "a p99 of 900ms", "three flaky tests nobody owns", "a 12-step local setup", "two hours to a first successful API call", "a 6MB jump in bundle size"],
    scenes: ["a team migrating off a homegrown tool", "an eval that came down to docs quality", "a Friday deploy that went sideways", "a proof of concept with a two-day budget", "a service that had no runbook until it paged someone"],
    takes: ["Engineers don't read the landing page. They read the quickstart and the error messages.", "Time to first successful call is the only onboarding metric that matters.", "A config option you can't explain is a support ticket you haven't received yet."],
  },
  HR_TECH: {
    roles: ["a People Ops lead", "the first HR hire", "a talent partner", "a Head of People", "a comp analyst", "a manager running their first hiring loop"],
    tools: ["the interview scorecards", "an HRIS migration", "the leveling framework", "onboarding week one", "the engagement survey", "the offer approval chain"],
    metrics: ["a 46-day time to hire", "18% attrition in the first year", "a 2.9 out of 5 onboarding score", "11 open roles and two recruiters", "a pay band with a 60% spread", "a 30% offer-decline rate on senior roles"],
    scenes: ["a company going from 80 to 200 people", "a team hiring its first manager of managers", "a reorg that touched every job title", "an offer that collapsed over equity", "an org that had never written its levels down"],
    takes: ["Onboarding is a retention lever, not an IT ticket.", "If your levels aren't written down, you still have levels. They are just secret and unfair.", "A hiring loop with no scorecard is five people voting on vibes."],
  },
  PRODUCT: {
    roles: ["a first PM", "a group PM", "a founder acting as PM", "a designer covering product", "a PM who just inherited a roadmap", "an APM in their first quarter"],
    tools: ["the discovery interviews", "a RICE spreadsheet", "the quarterly roadmap", "the activation funnel", "a feature-flag rollout", "the churn survey"],
    metrics: ["a 24% activation rate", "three of ten users reaching the aha moment", "a five-point drop in NPS", "seven half-built features", "a 40% gap between trial and paid", "a backlog with 300 open items"],
    scenes: ["a team shipping weekly that no one was using", "a roadmap set by the loudest customer", "a launch that moved no metric", "a quarter spent rewriting instead of shipping", "a product with four owners and no owner"],
    takes: ["A feature nobody would fight to keep is a feature you can delete.", "Roadmaps exist to say no in advance.", "If discovery never kills an idea, it is not discovery, it is theatre."],
  },
  MARKETING_OPS: {
    roles: ["a marketing ops manager", "a demand gen lead", "a lifecycle marketer", "a Marketo admin", "a campaign ops specialist", "the person who owns the lead lifecycle"],
    tools: ["the lead scoring model", "a nurture track", "UTM governance", "the form strategy", "the Marketo-to-Salesforce sync", "list import hygiene"],
    metrics: ["a 12% MQL-to-SQL rate", "4,000 leads stuck in a nurture loop", "a three-day sync delay", "38% of leads with no source", "a lead record with 200 fields", "a 9% spike in email unsubscribes"],
    scenes: ["a stack with three tools doing one job", "a rebrand that broke every tracking link", "a quarter where finance and marketing reported different pipeline", "a nurture program nobody had audited in two years", "a routing rule with an exception for every rep"],
    takes: ["Any automation you can't explain in one sentence is a future incident.", "Attribution is a conversation starter, not a verdict.", "Lead scoring that sales doesn't trust is just a number you pay for."],
  },
  FINTECH: {
    roles: ["a payments PM", "a compliance lead", "a founder pre-Series-B", "a risk analyst", "an engineer on the ledger team", "a treasury manager"],
    tools: ["the reconciliation job", "KYC onboarding", "the double-entry ledger", "chargeback handling", "the settlement file", "card-issuing webhooks"],
    metrics: ["a 0.4% dispute rate", "a three-week integration", "12k sitting unreconciled at month end", "a two-day settlement delay", "an 8% drop-off in KYC", "a 1.2% failed-payout rate"],
    scenes: ["a SaaS platform adding payouts", "an audit that started from a single spreadsheet", "a launch blocked on a partner bank", "a reconciliation break nobody could trace for a week", "a product where the ledger and the dashboard disagreed"],
    takes: ["In payments, the happy path is about 20% of the work.", "Your ledger is the product. The UI is just one view of it.", "Every rounding shortcut in money code is a reconciliation break with a delay timer."],
  },
  VERTICAL_SAAS: {
    roles: ["a founder selling into one industry", "a head of sales for a niche platform", "an implementation lead", "a product lead at a vertical SaaS", "an account manager", "a customer success lead"],
    tools: ["the onboarding checklist", "the integration with the incumbent system", "the pricing page", "a services attach motion", "the data migration", "the payments attach flow"],
    metrics: ["a 90-day implementation", "108% net revenue retention", "an ACV around 1,100", "a six-month sales cycle", "a 22% services mix", "40% of revenue riding on one integration"],
    scenes: ["a market that still runs on paper and phone calls", "a 12-location franchise buying its first real software", "a rip-and-replace of a 20-year-old on-prem tool", "a category with no analyst coverage", "a deal that hinged on one integration nobody had built yet"],
    takes: ["Vertical SaaS is won on implementation, not on the feature list.", "The incumbent is rarely software. It is a spreadsheet and a person named Dave.", "In a niche market, one reference customer is worth a quarter of marketing."],
  },
};

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

type PostShape = (v: VerticalVoice, p: <T>(a: readonly T[]) => T) => string;

// Seven shapes, deliberately different openings and lengths (~40-160 words):
// number, scene, opinion, contrarian list, confession, one-liner, playbook.
const POST_SHAPES: PostShape[] = [
  (v, p) =>
    `${cap(p(v.metrics))}. That was ${p(v.scenes)} last quarter.\n\n` +
    `We didn't add headcount or buy anything. We rewrote ${p(v.tools)} into one page, gave ${p(v.roles)} a single number to own, and dropped the weekly status meeting about it. Two months on, it holds.`,
  (v, p) =>
    `${cap(p(v.roles))} messaged me on Friday: "${cap(p(v.metrics))} and leadership wants an answer Monday."\n\n` +
    `We got on a call and opened ${p(v.tools)} together. The work was fine. The problem was that ${p(v.scenes)} had three unwritten versions of the same rule and everyone was optimising for a different one.\n\n` +
    `We wrote the rule down. One paragraph, in the channel where the work happens, not a wiki nobody opens. The number started moving inside three weeks. Most of this job is that unglamorous.`,
  (v, p) =>
    `${p(v.takes)}\n\n` +
    `I have watched this at ${p(v.scenes)} twice now. Both times the fix started with ${p(v.tools)}, not a new tool and not a new hire. If ${p(v.metrics)} is staring back at you, start there before you sign a contract with anyone.`,
  (v, p) =>
    `Mild heresy after a year doing this full time.\n\n${p(v.takes)}\n\n` +
    `What that looked like at ${p(v.scenes)}:\n` +
    `- ${cap(p(v.roles))} owned one number end to end, not five\n` +
    `- ${cap(p(v.tools))} went from tribal knowledge to three written sentences\n` +
    `- we reported ${p(v.metrics)} when it changed, not on a schedule\n\n` +
    `None of it needed budget. It needed someone with the authority to make a call and the patience to write it down.`,
  (v, p) =>
    `I got this wrong for most of a decade. I treated ${p(v.tools)} as ${p(v.roles)}'s private side quest and never looked closely.\n\n` +
    `Then ${p(v.scenes)} turned ${p(v.metrics)} into a board-level conversation and I had to actually learn how it worked.\n\n` +
    `The lesson that stuck: the plumbing is the product. If the person who owns it can't walk you through it in two minutes, it breaks in month three, quietly, on a Friday, right before a review.`,
  (v, p) =>
    `${cap(p(v.metrics))} is rarely a case of people not trying hard enough.\n\n` +
    `I watched ${p(v.scenes)} sit on it for a full quarter. The week ${p(v.roles)} was handed one rule to enforce in ${p(v.tools)}, it started to move. Decisions, not effort.`,
  (v, p) =>
    `If you inherit ${p(v.tools)} at ${p(v.scenes)}, here is the order I would work in today.\n\n` +
    `Week one: change nothing. Sit next to ${p(v.roles)} and watch how ${p(v.metrics)} is actually produced. Write down every point where a human makes a judgment call.\n\n` +
    `Week two: turn the three most common judgment calls into written rules. Not a policy doc. Three sentences, pinned where the work happens.\n\n` +
    `Week three: pick one report and make it correct. Exactly one. When people trust that report, they give you room to fix the rest.\n\n` +
    `I have run this twice, same order both times. It is slow for a month and then it compounds.`,
];

const usedPosts = new Set<string>();

// Build a post for `vertical` starting from shape `shapeIdx`, rotating shapes
// on the rare collision so every one of the 200 seeded posts is unique.
function makePost(vertical: Vertical, shapeIdx: number): string {
  const v = VOICE[vertical];
  let out = "";
  for (let attempt = 0; attempt < 200; attempt++) {
    out = nth(POST_SHAPES, (shapeIdx + attempt) % POST_SHAPES.length)(v, pick);
    if (!usedPosts.has(out)) break;
  }
  usedPosts.add(out);
  return out;
}

const REFERRERS = [
  "https://www.linkedin.com/",
  "https://www.linkedin.com/feed/",
  "https://www.google.com/",
  "https://x.com/",
  null,
];

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
  "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Mobile Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0 Safari/537.36",
];

// --- Volume targets (docs/RECON.md §11-12 seed calibration) ----------------
const CREATOR_COUNT = 40;
const PUBLISHED_POST_TARGET = 96; // Post rows with publishedAt set (LIVE + PAID)

interface CreatorRow {
  index: number;
  profileId: string;
  vertical: Vertical;
  medianViews: number;
  postCostCents: number;
  network: Network;
}

async function main(): Promise<void> {
  console.log("Seeding...");
  const passwordHash = await bcrypt.hash("password123", 10);

  // --- Creators + audience segments + recent posts -------------------------
  const creatorRows: CreatorRow[] = [];
  let engagerTotal = 0;

  for (let i = 0; i < CREATOR_COUNT; i++) {
    const c = buildCreator(i);
    engagerTotal += c.observedEngagerCount;

    const user = await prisma.user.create({
      data: {
        email: c.email,
        password: passwordHash,
        role: "CREATOR",
        creatorProfile: {
          create: {
            displayName: c.displayName,
            headline: c.headline,
            vertical: c.vertical,
            network: c.network,
            followerCount: c.followerCount,
            country: c.country,
            language: c.language,
            postCostCents: c.postCostCents,
            bundle5PriceCents: c.bundle5PriceCents,
            medianViews: c.medianViews,
            observedEngagerCount: c.observedEngagerCount,
            postsAnalyzed: c.postsAnalyzed,
            engagementRate: c.engagementRate,
          },
        },
      },
      include: { creatorProfile: true },
    });
    const profile = user.creatorProfile;
    if (!profile) throw new Error("creatorProfile not created");

    // Audience: 4 dimensions, 4 segments each, each dimension summing to 100.
    const segmentData = [];
    for (const dimension of Object.values(AudienceDimension)) {
      const labels = segmentLabels(dimension, c);
      const pcts = splitToHundredDesc();
      for (let s = 0; s < 4; s++) {
        segmentData.push({
          creatorProfileId: profile.id,
          dimension,
          label: nth(labels, s),
          percentage: nth(pcts, s),
        });
      }
    }
    await prisma.audienceSegment.createMany({ data: segmentData });

    // Five recent public posts, newest first within the last ~35 days. Each
    // post uses a different shape, and every count is jittered off its base so
    // the engagement column doesn't read as computed.
    const postDays = shuffled([2, 6, 11, 18, 27, 33]).slice(0, 5).sort((a, b) => a - b);
    const shapeOrder = shuffled([0, 1, 2, 3, 4, 5, 6]);
    for (let p = 0; p < 5; p++) {
      const onOther = c.crossPosts && p % 2 === 1;
      const net = onOther ? (c.network === Network.LINKEDIN ? Network.X : Network.LINKEDIN) : c.network;
      const views = messy(c.medianViews * randomFloat(0.55, 1.7), 0.04);
      const reactions = messy(views * randomFloat(0.015, 0.05), 0.08);
      const activityId = randomInt(1_000_000_000, 9_999_999_999);
      const handle = c.displayName.toLowerCase().replace(/[^a-z]+/g, "");
      const externalUrl =
        net === Network.LINKEDIN
          ? `https://www.linkedin.com/posts/${handle}-activity-${activityId}`
          : `https://x.com/${handle}/status/${activityId}`;
      await prisma.creatorPost.create({
        data: {
          creatorProfileId: profile.id,
          network: net,
          content: makePost(c.vertical, nth(shapeOrder, p)),
          publishedAt: daysAgo(nth(postDays, p)),
          views,
          reactions,
          comments: messy(reactions * randomFloat(0.08, 0.22), 0.1),
          reposts: messy(reactions * randomFloat(0.03, 0.12), 0.12),
          externalUrl,
        },
      });
    }

    creatorRows.push({
      index: i,
      profileId: profile.id,
      vertical: c.vertical,
      medianViews: c.medianViews,
      postCostCents: c.postCostCents,
      network: c.network,
    });
  }

  const costByProfileId = new Map(creatorRows.map((r) => [r.profileId, r.postCostCents]));

  // --- Companies ---------------------------------------------------------
  const companyDefs = [
    { name: "Vertice Analytics", website: "https://vertice-analytics.example.com", email: "ops@vertice-analytics.example.com" },
    { name: "Ledgerly", website: "https://ledgerly.example.com", email: "growth@ledgerly.example.com" },
  ];

  const companies = [];
  for (const def of companyDefs) {
    const user = await prisma.user.create({
      data: {
        email: def.email,
        password: passwordHash,
        role: "COMPANY",
        company: { create: { name: def.name, website: def.website } },
      },
      include: { company: true },
    });
    if (!user.company) throw new Error("company not created");
    companies.push(user.company);
  }
  const [vertice, ledgerly] = companies;
  if (!vertice || !ledgerly) throw new Error("expected two companies");

  // --- Campaigns + ICPs -------------------------------------------------
  const campaignDefs = [
    {
      company: vertice,
      name: "Q4 RevOps Awareness",
      targetVertical: Vertical.REVOPS,
      objective: "Build awareness for the new forecasting module among RevOps leaders.",
      brief: "Introduce Vertice's forecasting module to RevOps and sales ops audiences on LinkedIn.",
      keyMessages: "Forecast accuracy, less spreadsheet glue, faster close.",
      guidelines: "No discount codes. Tag @VerticeAnalytics. Keep tone practitioner, not salesy.",
      destinationUrl: "https://vertice-analytics.example.com/lp/forecasting",
      budgetCents: 1_200_000,
      status: CampaignStatus.DRAFT,
      icps: [
        { title: "RevOps leaders at Series B-D B2B SaaS", description: "Own the forecast and the GTM data model. Measured on forecast accuracy and pipeline hygiene; tired of reconciling three tools by hand every month-end." },
        { title: "Sales operations managers", description: "Run CRM process and reporting for a 20-80 rep org. Feel the pain of spreadsheet glue and want a system leadership will actually trust." },
        { title: "VP Sales and CROs", description: "Sign off on the number to the board. Want fewer surprises in the forecast, not another dashboard to check." },
      ],
    },
    {
      company: vertice,
      name: "DevTools Integration Launch",
      targetVertical: Vertical.DEVTOOLS,
      objective: "Drive signups for the new API integration among developer-tool creators.",
      brief: "Get developer-focused creators to demo the new webhook integration.",
      keyMessages: "5-minute setup, no vendor lock-in, generous free tier.",
      guidelines: "Include a code screenshot or short demo clip if possible.",
      destinationUrl: "https://vertice-analytics.example.com/lp/integrations",
      budgetCents: 800_000,
      status: CampaignStatus.LIVE,
      icps: [
        { title: "Platform and infrastructure engineers", description: "Evaluate and wire up internal tooling. Allergic to vendor lock-in and to anything that takes a day to set up." },
        { title: "Engineering managers at 30-150 person orgs", description: "Approve tooling spend. Care about time-to-value and the ongoing maintenance burden more than the feature list." },
        { title: "Developer advocates and DX leads", description: "Amplify tools they genuinely use. Will happily demo something that sets up in five minutes and reads well in a post." },
      ],
    },
    {
      company: ledgerly,
      name: "Fintech Trust Campaign",
      targetVertical: Vertical.FINTECH,
      objective: "Position Ledgerly as the compliant embedded-finance layer for vertical SaaS.",
      brief: "Explain embedded finance risk/compliance tradeoffs through fintech and vertical SaaS creators.",
      keyMessages: "PCI-DSS out of the box, 3-week integration, audit-ready.",
      guidelines: "Avoid promising specific APRs or rates.",
      destinationUrl: "https://ledgerly.example.com/lp/embedded-finance",
      budgetCents: 1_500_000,
      status: CampaignStatus.LIVE,
      icps: [
        { title: "Product leaders at vertical SaaS platforms", description: "Considering embedded payments or lending as a revenue line. Worried about the compliance scope they would be taking on." },
        { title: "Fintech founders pre-Series B", description: "Building financial products now. Need PCI-DSS and audit readiness without a twelve-month integration project." },
        { title: "Heads of compliance and risk", description: "Sign off on financial partnerships. Want the audit trail and the shared-responsibility model spelled out up front." },
      ],
    },
    {
      company: ledgerly,
      name: "Summer Payouts Push",
      targetVertical: Vertical.HR_TECH,
      objective: "Drive demo bookings from HR-tech and product audiences evaluating payout rails.",
      brief: "Completed campaign from earlier this year, kept for historical reporting.",
      keyMessages: "Same-day payouts, single API, built-in tax forms.",
      guidelines: "Completed campaign, no further posts.",
      destinationUrl: "https://ledgerly.example.com/lp/payouts",
      budgetCents: 900_000,
      status: CampaignStatus.COMPLETED,
      icps: [
        { title: "People ops leads at contractor platforms", description: "Run contractor payments day to day. Measured on payout speed and tax-form accuracy at year end." },
        { title: "Product managers who own the payouts flow", description: "Ship the money-out experience. Want one API to integrate, not five, and clear failure states." },
        { title: "Finance leads at marketplaces", description: "Own reconciliation and tax reporting. Need same-day settlement visibility and an export their auditors accept." },
      ],
    },
  ];

  const campaigns = [];
  for (const def of campaignDefs) {
    const campaign = await prisma.campaign.create({
      data: {
        companyId: def.company.id,
        name: def.name,
        targetVertical: def.targetVertical,
        objective: def.objective,
        brief: def.brief,
        keyMessages: def.keyMessages,
        guidelines: def.guidelines,
        destinationUrl: def.destinationUrl,
        budgetCents: def.budgetCents,
        status: def.status,
        startDate: randomDateWithinLastDays(60),
        endDate: def.status === CampaignStatus.COMPLETED ? randomDateWithinLastDays(10) : null,
        icps: {
          create: def.icps.map((icp, idx) => ({
            rank: idx + 1,
            title: icp.title,
            description: icp.description,
          })),
        },
      },
    });
    campaigns.push(campaign);
  }
  const [draftCampaign, devtoolsCampaign, fintechCampaign, payoutsCampaign] = campaigns;
  if (!draftCampaign || !devtoolsCampaign || !fintechCampaign || !payoutsCampaign) {
    throw new Error("expected four campaigns");
  }

  // --- Bookings -------------------------------------------------------------
  // Two blocks:
  //   1. Published block — PUBLISHED_POST_TARGET bookings in LIVE/PAID across
  //      the three non-draft campaigns, cycling every creator so all 40 are
  //      "activated". Each carries a published Post + TrackedLink + Payout.
  //   2. Coverage block — the remaining statuses (INVITED both directions,
  //      ACCEPTED, DECLINED, DRAFT_READY, SCHEDULED) so every BookingStatus and
  //      both BookingInitiator values are represented.
  interface BookingPlan {
    campaignId: string;
    creator: CreatorRow;
    status: BookingStatus;
    initiatedBy: BookingInitiator;
  }
  const plans: BookingPlan[] = [];

  const publishCampaignPool: string[] = [
    ...Array<string>(32).fill(devtoolsCampaign.id),
    ...Array<string>(34).fill(fintechCampaign.id),
    ...Array<string>(30).fill(payoutsCampaign.id),
  ];
  for (let i = 0; i < PUBLISHED_POST_TARGET; i++) {
    const campaignId = nth(publishCampaignPool, i);
    const creator = nth(creatorRows, i % CREATOR_COUNT);
    // The completed campaign is fully paid out; live campaigns mostly LIVE.
    const status =
      campaignId === payoutsCampaign.id
        ? BookingStatus.PAID
        : Math.random() < 0.25
          ? BookingStatus.PAID
          : BookingStatus.LIVE;
    plans.push({
      campaignId,
      creator,
      status,
      initiatedBy: Math.random() < 0.18 ? BookingInitiator.CREATOR : BookingInitiator.BRAND,
    });
  }

  const coverage: Array<[BookingStatus, BookingInitiator, string]> = [
    [BookingStatus.INVITED, BookingInitiator.BRAND, draftCampaign.id],
    [BookingStatus.INVITED, BookingInitiator.BRAND, draftCampaign.id],
    [BookingStatus.INVITED, BookingInitiator.BRAND, devtoolsCampaign.id],
    [BookingStatus.INVITED, BookingInitiator.BRAND, fintechCampaign.id],
    [BookingStatus.INVITED, BookingInitiator.CREATOR, devtoolsCampaign.id],
    [BookingStatus.INVITED, BookingInitiator.CREATOR, fintechCampaign.id],
    [BookingStatus.INVITED, BookingInitiator.CREATOR, draftCampaign.id],
    [BookingStatus.ACCEPTED, BookingInitiator.BRAND, draftCampaign.id],
    [BookingStatus.ACCEPTED, BookingInitiator.CREATOR, devtoolsCampaign.id],
    [BookingStatus.ACCEPTED, BookingInitiator.BRAND, fintechCampaign.id],
    [BookingStatus.DECLINED, BookingInitiator.BRAND, draftCampaign.id],
    [BookingStatus.DECLINED, BookingInitiator.CREATOR, devtoolsCampaign.id],
    [BookingStatus.DECLINED, BookingInitiator.BRAND, payoutsCampaign.id],
    [BookingStatus.DRAFT_READY, BookingInitiator.BRAND, devtoolsCampaign.id],
    [BookingStatus.DRAFT_READY, BookingInitiator.BRAND, fintechCampaign.id],
    [BookingStatus.DRAFT_READY, BookingInitiator.CREATOR, devtoolsCampaign.id],
    [BookingStatus.SCHEDULED, BookingInitiator.BRAND, devtoolsCampaign.id],
    [BookingStatus.SCHEDULED, BookingInitiator.BRAND, fintechCampaign.id],
    [BookingStatus.SCHEDULED, BookingInitiator.CREATOR, fintechCampaign.id],
  ];
  coverage.forEach(([status, initiatedBy, campaignId], k) => {
    plans.push({ campaignId, creator: nth(creatorRows, (k * 7 + 3) % CREATOR_COUNT), status, initiatedBy });
  });

  const POST_STATUSES = new Set<BookingStatus>([
    BookingStatus.DRAFT_READY,
    BookingStatus.SCHEDULED,
    BookingStatus.LIVE,
    BookingStatus.PAID,
  ]);
  const TRACKED_LINK_STATUSES = new Set<BookingStatus>([
    BookingStatus.ACCEPTED,
    BookingStatus.DRAFT_READY,
    BookingStatus.SCHEDULED,
    BookingStatus.LIVE,
    BookingStatus.PAID,
  ]);

  const publishedTrackedLinks: { trackedLinkId: string; volume: number }[] = [];
  let publishedPostCount = 0;
  let impressionTotal = 0;
  const activatedCreatorIds = new Set<string>();

  for (const plan of plans) {
    activatedCreatorIds.add(plan.creator.profileId);
    const negotiated = Math.round(
      (costByProfileId.get(plan.creator.profileId) ?? 20_000) * randomFloat(0.9, 1.12),
    );

    const booking = await prisma.booking.create({
      data: {
        campaignId: plan.campaignId,
        creatorProfileId: plan.creator.profileId,
        agreedPriceCents: negotiated,
        status: plan.status,
        initiatedBy: plan.initiatedBy,
        deliverable: "1 sponsored LinkedIn post with tracked CTA link",
        deadline: randomDateWithinLastDays(21),
      },
    });

    const isPublished = plan.status === BookingStatus.LIVE || plan.status === BookingStatus.PAID;

    let trackedLinkId: string | undefined;
    if (TRACKED_LINK_STATUSES.has(plan.status)) {
      const campaign = campaigns.find((c) => c.id === plan.campaignId);
      if (!campaign) throw new Error("campaign not found for booking");
      const link = await prisma.trackedLink.create({
        data: {
          bookingId: booking.id,
          slug: randomBytes(4).toString("hex"),
          destinationUrl: campaign.destinationUrl,
        },
      });
      trackedLinkId = link.id;
    }

    if (POST_STATUSES.has(plan.status)) {
      // Published-post impressions are calibrated to sum to roughly 184K over
      // ~96 posts (docs/RECON.md §12) — the brand's attributed-impression stat,
      // which sits well below the creator's own median reach.
      let impressions = 0;
      if (isPublished) {
        impressions = messy(randomInt(800, 3_050), 0);
        impressionTotal += impressions;
        publishedPostCount += 1;
      }
      await prisma.post.create({
        data: {
          bookingId: booking.id,
          content: "Sharing how we approached this with the team — full breakdown in the link below.",
          linkedinUrl: isPublished
            ? `https://www.linkedin.com/posts/activity-${randomInt(1_000_000_000, 9_999_999_999)}`
            : null,
          publishedAt: isPublished ? randomDateWithinLastDays(25) : null,
          impressions,
        },
      });

      if (isPublished && trackedLinkId) {
        const ctr = randomInt(70, 180) / 10_000; // 0.70%-1.80%
        publishedTrackedLinks.push({
          trackedLinkId,
          volume: Math.max(1, Math.round(impressions * ctr)),
        });
      }
    }

    if (isPublished) {
      await prisma.payout.create({
        data: {
          bookingId: booking.id,
          amountCents: negotiated,
          status: plan.status === BookingStatus.PAID ? PayoutStatus.PAID : PayoutStatus.PENDING,
          paidAt: plan.status === BookingStatus.PAID ? randomDateWithinLastDays(6) : null,
        },
      });
    }
  }

  // --- Click events -------------------------------------------------------
  const clickEventData = [];
  for (const { trackedLinkId, volume } of publishedTrackedLinks) {
    for (let i = 0; i < volume; i++) {
      clickEventData.push({
        trackedLinkId,
        createdAt: randomDateWithinLastDays(30),
        referrer: pick(REFERRERS),
        userAgent: pick(USER_AGENTS),
        ipHash: fakeHash(),
        isLead: Math.random() < 0.06,
      });
    }
  }
  await prisma.clickEvent.createMany({ data: clickEventData });

  // --- Shortlist --------------------------------------------------------------
  // A campaign-scoped shortlist so the marketplace Shortlist tab has content.
  // Favour creators whose vertical matches the campaign's target, so the saved
  // set looks like a considered pick rather than a random grab.
  const shortlistData: { campaignId: string; creatorProfileId: string }[] = [];
  const shortlistPlan: [string, Vertical, number][] = [
    [fintechCampaign.id, Vertical.FINTECH, 6],
    [devtoolsCampaign.id, Vertical.DEVTOOLS, 4],
    [draftCampaign.id, Vertical.REVOPS, 3],
  ];
  for (const [campaignId, preferVertical, count] of shortlistPlan) {
    const ranked = [...creatorRows].sort((a, b) => {
      const aMatch = a.vertical === preferVertical ? 0 : 1;
      const bMatch = b.vertical === preferVertical ? 0 : 1;
      return aMatch - bMatch || a.index - b.index;
    });
    for (const creator of ranked.slice(0, count)) {
      shortlistData.push({ campaignId, creatorProfileId: creator.profileId });
    }
  }
  await prisma.shortlistItem.createMany({ data: shortlistData });

  console.log(
    [
      `Seeded:`,
      `${creatorRows.length} creators`,
      `(${activatedCreatorIds.size} activated across campaigns)`,
      `${companies.length} companies`,
      `${campaigns.length} campaigns with ${campaigns.length * 3} ICPs`,
      `${plans.length} bookings`,
      `${publishedPostCount} published posts`,
      `${engagerTotal.toLocaleString("en-US")} engaged profiles`,
      `${impressionTotal.toLocaleString("en-US")} total impressions`,
      `${clickEventData.length} click events`,
      `${shortlistData.length} shortlist entries`,
    ].join(" · "),
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
