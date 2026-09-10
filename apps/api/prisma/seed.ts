import { randomBytes } from "node:crypto";
import { PrismaClient, Vertical, CampaignStatus, BookingStatus, PayoutStatus } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
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

function randomDateWithinLastDays(days: number): Date {
  const now = Date.now();
  const past = now - randomInt(0, days * 24 * 60 * 60 * 1000);
  return new Date(past);
}

function fakeHash(): string {
  return randomBytes(32).toString("hex");
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
  US: "en",
  GB: "en",
  DE: "de",
  FR: "fr",
  NL: "en",
  ES: "es",
  IT: "it",
  SE: "en",
  IE: "en",
  CA: "en",
  AU: "en",
  IN: "en",
  BR: "pt",
  PL: "en",
  PT: "pt",
};

// 40 distinct first names, indexed by creator number so no two creators share
// a full name.
const FIRST_NAMES = [
  "Emma", "Liam", "Olivia", "Noah", "Ava", "Lucas", "Sophie", "Mateo", "Isabella", "Finn",
  "Mia", "Elias", "Charlotte", "Hugo", "Amelia", "Leon", "Freya", "Nils", "Clara", "Theo",
  "Laura", "Marco", "Nora", "Sven", "Julia", "Jonas", "Elin", "Rafael", "Ines", "Erik",
  "Zoe", "Adam", "Lena", "Victor", "Maya", "Karl", "Alicia", "Sam", "Ruby", "Otto",
];
// 24 surnames, assigned by `index % 24` so each is used at most twice across
// the 40 creators.
const LAST_NAMES = [
  "Berg", "Novak", "Fischer", "Rossi", "Dubois", "Andersen", "Silva", "Kowalski",
  "Meyer", "Lund", "Garcia", "Weber", "Larsen", "Moreau", "Conti", "Schmidt",
  "Costa", "Nilsson", "Keller", "Haas", "Petit", "Romano", "Becker", "Sorensen",
];

// At least 5 needed per vertical (40 creators / 8 verticals). Pools are wider
// than that for headroom, and no headline repeats within or across verticals,
// so all 40 creators get a unique bio.
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

// Non-overlapping price bands per follower tier. Because the bands do not
// overlap, price is monotonic across tiers by construction — a higher-tier
// creator is never cheaper than a lower-tier one, whatever the noise does.
const TIER_BANDS = [
  { followerMin: 1_000, followerMax: 10_000, priceMin: 20, priceMax: 120 },
  { followerMin: 10_000, followerMax: 50_000, priceMin: 130, priceMax: 400 },
  { followerMin: 50_000, followerMax: 150_000, priceMin: 420, priceMax: 900 },
  { followerMin: 150_000, followerMax: 500_000, priceMin: 950, priceMax: 1_500 },
] as const;

// Scarce verticals command a premium at the same follower count.
const SCARCE_VERTICALS = new Set<Vertical>([Vertical.DEVTOOLS, Vertical.FINTECH, Vertical.REVOPS]);

// avgImpressions as a percentage of followerCount, per tier. Smaller creators
// skew toward the top of the 40%-150% band, which is the real pattern.
const IMPRESSION_RATIO_PCT: ReadonlyArray<readonly [number, number]> = [
  [100, 150],
  [75, 120],
  [55, 95],
  [40, 70],
];

function tierFollowerCount(tierIndex: number): number {
  const band = nth(TIER_BANDS, tierIndex);
  return randomInt(band.followerMin, band.followerMax);
}

function priceEurFor(tierIndex: number, followerCount: number, vertical: Vertical): number {
  const band = nth(TIER_BANDS, tierIndex);
  const followerSpan = band.followerMax - band.followerMin;
  let pos = (followerCount - band.followerMin) / followerSpan; // 0..1 within tier
  pos = Math.min(1, Math.max(0, pos));
  if (SCARCE_VERTICALS.has(vertical)) pos = pos * 0.65 + 0.35; // skew toward band top
  const priceSpan = band.priceMax - band.priceMin;
  let price = band.priceMin + pos * priceSpan;
  price += (Math.random() * 2 - 1) * priceSpan * 0.08; // deliberate noise
  price = Math.min(band.priceMax, Math.max(band.priceMin, price));
  return Math.round(price);
}

function avgImpressionsFor(tierIndex: number, followerCount: number): number {
  const [lo, hi] = nth(IMPRESSION_RATIO_PCT, tierIndex);
  return Math.round((followerCount * randomInt(lo, hi)) / 100);
}

interface CreatorSeed {
  displayName: string;
  email: string;
  vertical: Vertical;
  followerCount: number;
  pricePerPostCents: number;
  country: string;
  language: string;
  avgImpressions: number;
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

  // Long-tail distribution: mostly nano/micro creators, a few macro ones.
  const tierRoll = Math.random();
  let tierIndex: number;
  if (tierRoll < 0.4) tierIndex = 0;
  else if (tierRoll < 0.75) tierIndex = 1;
  else if (tierRoll < 0.93) tierIndex = 2;
  else tierIndex = 3;

  const followerCount = tierFollowerCount(tierIndex);
  const priceEur = priceEurFor(tierIndex, followerCount, vertical);
  const avgImpressions = avgImpressionsFor(tierIndex, followerCount);
  const engagementRate = randomInt(150, 800) / 10000; // 1.5% - 8%

  return {
    displayName,
    email: `${first.toLowerCase()}.${last.toLowerCase()}${index}@creators.naano.dev`,
    vertical,
    followerCount,
    pricePerPostCents: priceEur * 100,
    country,
    language,
    avgImpressions,
    engagementRate,
    headline: nth(VERTICAL_HEADLINES[vertical], rankWithinVertical),
  };
}

const REFERRERS = [
  "https://www.linkedin.com/",
  "https://www.linkedin.com/feed/",
  "https://www.google.com/",
  "https://twitter.com/",
  null,
];

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
  "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Mobile Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0 Safari/537.36",
];

async function main(): Promise<void> {
  console.log("Seeding...");
  const passwordHash = await bcrypt.hash("password123", 10);

  // --- Creators -----------------------------------------------------------
  const creatorRecords: {
    profileId: string;
    vertical: Vertical;
    avgImpressions: number;
  }[] = [];

  for (let i = 0; i < 40; i++) {
    const c = buildCreator(i);
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
            followerCount: c.followerCount,
            country: c.country,
            language: c.language,
            pricePerPostCents: c.pricePerPostCents,
            avgImpressions: c.avgImpressions,
            engagementRate: c.engagementRate,
          },
        },
      },
      include: { creatorProfile: true },
    });

    if (!user.creatorProfile) throw new Error("creatorProfile not created");
    creatorRecords.push({
      profileId: user.creatorProfile.id,
      vertical: c.vertical,
      avgImpressions: c.avgImpressions,
    });
  }

  const avgImpressionsByProfileId = new Map(
    creatorRecords.map((r) => [r.profileId, r.avgImpressions]),
  );

  // --- Companies ------------------------------------------------------------
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
        company: {
          create: {
            name: def.name,
            website: def.website,
          },
        },
      },
      include: { company: true },
    });
    if (!user.company) throw new Error("company not created");
    companies.push(user.company);
  }

  const [vertice, ledgerly] = companies;
  if (!vertice || !ledgerly) throw new Error("expected two companies");

  // --- Campaigns --------------------------------------------------------
  const campaignDefs = [
    {
      company: vertice,
      name: "Q4 RevOps Awareness",
      objective: "Build awareness for the new forecasting module among RevOps leaders.",
      brief: "Introduce Vertice's forecasting module to RevOps and sales ops audiences on LinkedIn.",
      keyMessages: "Forecast accuracy, less spreadsheet glue, faster close.",
      guidelines: "No discount codes. Tag @VerticeAnalytics. Keep tone practitioner, not salesy.",
      destinationUrl: "https://vertice-analytics.example.com/lp/forecasting",
      budgetCents: 1_200_000,
      status: CampaignStatus.DRAFT,
    },
    {
      company: vertice,
      name: "DevTools Integration Launch",
      objective: "Drive signups for the new API integration among developer-tool creators.",
      brief: "Get developer-focused creators to demo the new webhook integration.",
      keyMessages: "5-minute setup, no vendor lock-in, generous free tier.",
      guidelines: "Include a code screenshot or short demo clip if possible.",
      destinationUrl: "https://vertice-analytics.example.com/lp/integrations",
      budgetCents: 800_000,
      status: CampaignStatus.LIVE,
    },
    {
      company: ledgerly,
      name: "Fintech Trust Campaign",
      objective: "Position Ledgerly as the compliant embedded-finance layer for vertical SaaS.",
      brief: "Explain embedded finance risk/compliance tradeoffs through fintech and vertical SaaS creators.",
      keyMessages: "PCI-DSS out of the box, 3-week integration, audit-ready.",
      guidelines: "Avoid promising specific APRs or rates.",
      destinationUrl: "https://ledgerly.example.com/lp/embedded-finance",
      budgetCents: 1_500_000,
      status: CampaignStatus.LIVE,
    },
    {
      company: ledgerly,
      name: "Summer Payouts Push",
      objective: "Drive demo bookings from HR-tech and product audiences evaluating payout rails.",
      brief: "Completed campaign from earlier this year, kept for historical reporting.",
      keyMessages: "Same-day payouts, single API, built-in tax forms.",
      guidelines: "Completed campaign, no further posts.",
      destinationUrl: "https://ledgerly.example.com/lp/payouts",
      budgetCents: 900_000,
      status: CampaignStatus.COMPLETED,
    },
  ];

  const campaigns = [];
  for (const def of campaignDefs) {
    const campaign = await prisma.campaign.create({
      data: {
        companyId: def.company.id,
        name: def.name,
        objective: def.objective,
        brief: def.brief,
        keyMessages: def.keyMessages,
        guidelines: def.guidelines,
        destinationUrl: def.destinationUrl,
        budgetCents: def.budgetCents,
        status: def.status,
        startDate: randomDateWithinLastDays(60),
        endDate: def.status === CampaignStatus.COMPLETED ? randomDateWithinLastDays(10) : null,
      },
    });
    campaigns.push(campaign);
  }

  const [draftCampaign, devtoolsCampaign, fintechCampaign, payoutsCampaign] = campaigns;
  if (!draftCampaign || !devtoolsCampaign || !fintechCampaign || !payoutsCampaign) {
    throw new Error("expected four campaigns");
  }

  // --- Bookings, one per (campaign, creator) pair below -------------------
  // Explicit plan to guarantee every BookingStatus is represented.
  const byVertical = (v: Vertical) => creatorRecords.filter((c) => c.vertical === v);
  const devtoolCreators = byVertical(Vertical.DEVTOOLS);
  const fintechCreators = byVertical(Vertical.FINTECH);
  const vsaasCreators = byVertical(Vertical.VERTICAL_SAAS);
  const hrCreators = byVertical(Vertical.HR_TECH);
  const salesCreators = byVertical(Vertical.SALES);
  const revopsCreators = byVertical(Vertical.REVOPS);

  const bookingPlan: { campaignId: string; creatorProfileId: string; status: BookingStatus; agreedPriceCents: number }[] = [];

  const addBooking = (
    campaignId: string,
    creator: { profileId: string } | undefined,
    status: BookingStatus,
    priceCents: number,
  ) => {
    if (!creator) return;
    bookingPlan.push({ campaignId, creatorProfileId: creator.profileId, status, agreedPriceCents: priceCents });
  };

  // Draft campaign: not live yet, invitations only.
  addBooking(draftCampaign.id, revopsCreators[0], BookingStatus.INVITED, 15000);
  addBooking(draftCampaign.id, revopsCreators[1], BookingStatus.INVITED, 22000);
  addBooking(draftCampaign.id, salesCreators[0], BookingStatus.INVITED, 18000);

  // DevTools launch: full pipeline spread.
  addBooking(devtoolsCampaign.id, devtoolCreators[0], BookingStatus.ACCEPTED, 30000);
  addBooking(devtoolsCampaign.id, devtoolCreators[1], BookingStatus.DECLINED, 25000);
  addBooking(devtoolsCampaign.id, devtoolCreators[2], BookingStatus.DRAFT_READY, 45000);
  addBooking(devtoolsCampaign.id, devtoolCreators[3], BookingStatus.SCHEDULED, 38000);
  addBooking(devtoolsCampaign.id, devtoolCreators[4], BookingStatus.LIVE, 52000);
  addBooking(devtoolsCampaign.id, hrCreators[0], BookingStatus.LIVE, 27000);

  // Fintech trust campaign: mostly live, one paid.
  addBooking(fintechCampaign.id, fintechCreators[0], BookingStatus.LIVE, 60000);
  addBooking(fintechCampaign.id, fintechCreators[1], BookingStatus.LIVE, 41000);
  addBooking(fintechCampaign.id, fintechCreators[2], BookingStatus.PAID, 75000);
  addBooking(fintechCampaign.id, vsaasCreators[0], BookingStatus.LIVE, 33000);
  addBooking(fintechCampaign.id, vsaasCreators[1], BookingStatus.SCHEDULED, 29000);

  // Completed payouts campaign: mostly paid, one declined straggler.
  addBooking(payoutsCampaign.id, hrCreators[1], BookingStatus.PAID, 48000);
  addBooking(payoutsCampaign.id, hrCreators[2], BookingStatus.PAID, 36000);
  addBooking(payoutsCampaign.id, salesCreators[1], BookingStatus.PAID, 55000);
  addBooking(payoutsCampaign.id, salesCreators[2], BookingStatus.DECLINED, 20000);
  addBooking(payoutsCampaign.id, revopsCreators[2], BookingStatus.PAID, 42000);

  const publishedTrackedLinks: { trackedLinkId: string; volume: number }[] = [];

  for (const plan of bookingPlan) {
    const booking = await prisma.booking.create({
      data: {
        campaignId: plan.campaignId,
        creatorProfileId: plan.creatorProfileId,
        agreedPriceCents: plan.agreedPriceCents,
        status: plan.status,
        deliverable: "1 sponsored LinkedIn post with tracked CTA link",
        deadline: randomDateWithinLastDays(14),
      },
    });

    const hasTrackedLink = plan.status !== BookingStatus.INVITED && plan.status !== BookingStatus.DECLINED;
    const postStatuses: BookingStatus[] = [
      BookingStatus.DRAFT_READY,
      BookingStatus.SCHEDULED,
      BookingStatus.LIVE,
      BookingStatus.PAID,
    ];
    const hasPost = postStatuses.includes(plan.status);
    const isPublished = plan.status === BookingStatus.LIVE || plan.status === BookingStatus.PAID;

    let trackedLinkId: string | undefined;
    if (hasTrackedLink) {
      const campaign = campaigns.find((c) => c.id === plan.campaignId);
      if (!campaign) throw new Error("campaign not found for booking");
      const slug = `${randomBytes(4).toString("hex")}`;
      const trackedLink = await prisma.trackedLink.create({
        data: {
          bookingId: booking.id,
          slug,
          destinationUrl: campaign.destinationUrl,
        },
      });
      trackedLinkId = trackedLink.id;
    }

    // Post impressions track the creator's avgImpressions with some noise, so
    // CTR (clicks / impressions, computed below) stays believable per creator.
    let postImpressions = 0;
    if (hasPost) {
      if (isPublished) {
        const base = avgImpressionsByProfileId.get(plan.creatorProfileId) ?? 20_000;
        postImpressions = Math.round((base * randomInt(80, 130)) / 100);
      }
      await prisma.post.create({
        data: {
          bookingId: booking.id,
          content: "Sharing how we approached this with the team — full breakdown in the link below.",
          linkedinUrl: isPublished ? `https://www.linkedin.com/posts/activity-${randomInt(1000000000, 9999999999)}` : null,
          publishedAt: isPublished ? randomDateWithinLastDays(25) : null,
          impressions: postImpressions,
        },
      });
    }

    if (plan.status === BookingStatus.LIVE || plan.status === BookingStatus.PAID) {
      await prisma.payout.create({
        data: {
          bookingId: booking.id,
          amountCents: plan.agreedPriceCents,
          status: plan.status === BookingStatus.PAID ? PayoutStatus.PAID : PayoutStatus.PENDING,
          paidAt: plan.status === BookingStatus.PAID ? randomDateWithinLastDays(5) : null,
        },
      });
    }

    if (isPublished && trackedLinkId) {
      // 0.70% - 1.80% CTR, in line with the published examples in docs/PRODUCT.md.
      const ctr = randomInt(70, 180) / 10_000;
      const volume = Math.max(1, Math.round(postImpressions * ctr));
      publishedTrackedLinks.push({ trackedLinkId, volume });
    }
  }

  // --- Click events over the last 30 days ---------------------------------
  const clickEventData = [];
  for (const { trackedLinkId, volume } of publishedTrackedLinks) {
    for (let i = 0; i < volume; i++) {
      const isLead = Math.random() < 0.06;
      clickEventData.push({
        trackedLinkId,
        createdAt: randomDateWithinLastDays(30),
        referrer: pick(REFERRERS),
        userAgent: pick(USER_AGENTS),
        ipHash: fakeHash(),
        isLead,
      });
    }
  }

  await prisma.clickEvent.createMany({ data: clickEventData });

  console.log(`Seeded: ${creatorRecords.length} creators, ${companies.length} companies, ${campaigns.length} campaigns, ${bookingPlan.length} bookings, ${clickEventData.length} click events.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
