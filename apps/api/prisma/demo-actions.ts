/**
 * Demo-data maintenance, not a schema migration.
 *
 * Round 2 (docs/DECISIONS.md "Session: API, round 2", slice A1) added five
 * new lifecycle transitions — draft, publish, approve, request-changes,
 * mark-paid — between INVITED/ACCEPTED/DECLINED and PAID, which the seed
 * already covers. Whether any row actually sits in DRAFT_READY or SCHEDULED
 * for the demo creator, or DRAFT_READY/LIVE for the demo brand, is down to
 * the seed's random status assignment — not guaranteed. A reviewer (or a
 * fresh local reseed) can land with nothing actionable to demo on the new
 * screens without walking the whole loop by hand first. This tops that up,
 * idempotently.
 *
 * What it guarantees, after a run:
 *   - the demo creator (GET /auth/demo-creator's resolution: whoever the
 *     demo brand most recently booked, else the earliest-created creator)
 *     has >= 1 booking in each of INVITED, ACCEPTED, SCHEDULED.
 *   - the demo brand (Ledgerly) has >= 1 booking, with any creator, in each
 *     of DRAFT_READY and LIVE.
 *
 * Every booking this script creates or converts gets the child rows its
 * status implies — TrackedLink from ACCEPTED on, a Post with content from
 * DRAFT_READY on, Post.linkedinUrl/publishedAt from LIVE on — exactly what
 * the five real lifecycle endpoints would have written had someone walked
 * the whole loop by hand (see ensureChildRows below).
 *
 * Prefers creating a fresh booking in a campaign the target has no
 * non-declined booking in yet — same "one non-declined booking per
 * creator+campaign" rule POST /bookings enforces (a declined-only campaign
 * counts as free, same as the real endpoint treats it). Only when every
 * campaign is already taken does it fall back to converting an existing
 * non-declined, non-PAID booking in place.
 *
 * DRY RUN BY DEFAULT. It prints the plan and writes nothing unless you pass
 * --apply.
 *
 * Run from apps/api. `railway run` injects the INTERNAL database host, which
 * a laptop cannot resolve, so set DATABASE_URL to the public URL yourself:
 *
 *   # see the plan, change nothing
 *   DATABASE_URL="<DATABASE_PUBLIC_URL>" npx ts-node prisma/demo-actions.ts
 *
 *   # actually do it
 *   DATABASE_URL="<DATABASE_PUBLIC_URL>" npx ts-node prisma/demo-actions.ts --apply
 *
 *   # against your own local dev database instead
 *   npx ts-node prisma/demo-actions.ts --local --apply
 */
import { randomBytes } from "node:crypto";
import { BookingStatus, Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Prisma falls back to apps/api/.env when DATABASE_URL is not in the
 * environment, and that points at a local development database. Printing the
 * host (and refusing localhost unless you ask for it) is the difference
 * between topping up demo data on the live site and doing it on your laptop
 * while the output says it worked.
 */
function describeTarget(): { label: string; isLocal: boolean } {
  const raw = process.env.DATABASE_URL ?? "";
  if (!raw) return { label: "(unset — Prisma is reading apps/api/.env)", isLocal: true };
  try {
    const u = new URL(raw);
    const isLocal =
      u.hostname === "localhost" ||
      u.hostname === "127.0.0.1" ||
      u.hostname === "::1" ||
      u.hostname === "host.docker.internal";
    return { label: `${u.hostname}:${u.port || "5432"}${u.pathname}`, isLocal };
  } catch {
    return { label: "(unparseable DATABASE_URL)", isLocal: true };
  }
}

/** Same constant as apps/api/src/auth/auth.service.ts and prisma/free-creators.ts. */
const DEMO_BRAND_EMAIL = "growth@ledgerly.example.com";

const APPLY = process.argv.includes("--apply");

const DELIVERABLE = "1 sponsored LinkedIn post with tracked CTA link";
const DRAFT_CONTENT =
  "Sharing how we approached this with the team — full breakdown in the link below.";

const CREATOR_TARGETS: readonly BookingStatus[] = [
  BookingStatus.INVITED,
  BookingStatus.ACCEPTED,
  BookingStatus.SCHEDULED,
];
const BRAND_TARGETS: readonly BookingStatus[] = [BookingStatus.DRAFT_READY, BookingStatus.LIVE];

/** Same status ordering a demo should prefer landing fresh bookings in — live first, draft next, completed last. */
const CAMPAIGN_STATUS_PRIORITY: Record<string, number> = { LIVE: 0, DRAFT: 1, COMPLETED: 2 };

function trackedLinkSlug(): string {
  return randomBytes(9).toString("base64url");
}

async function resolveDemoBrand() {
  const user = await prisma.user.findUnique({
    where: { email: DEMO_BRAND_EMAIL },
    include: { company: true },
  });
  if (!user?.company) {
    throw new Error(`No company found for ${DEMO_BRAND_EMAIL}. Is this the right database?`);
  }
  return user.company;
}

/** Same resolution as AuthService.demoCreatorEmail(), minus the email lookup — this needs the id. */
async function resolveDemoCreator() {
  const mostRecent = await prisma.booking.findFirst({
    where: { campaign: { company: { user: { email: DEMO_BRAND_EMAIL } } } },
    orderBy: { createdAt: "desc" },
    include: { creatorProfile: true },
  });
  if (mostRecent) return mostRecent.creatorProfile;

  const fallback = await prisma.creatorProfile.findFirst({ orderBy: { createdAt: "asc" } });
  if (!fallback) throw new Error("No creators seeded. Is this the right database?");
  return fallback;
}

interface PlannedBooking {
  description: string;
  campaignId: string;
  destinationUrl: string;
  creatorProfileId: string;
  postCostCents: number;
  status: BookingStatus;
}

interface PlannedConversion {
  description: string;
  bookingId: string;
  destinationUrl: string;
  agreedPriceCents: number;
  status: BookingStatus;
}

/**
 * Every child row a booking's status implies, upserted so this is safe to
 * call on a row that already has some of them (the conversion path).
 * Mirrors exactly what accept / draft / publish / mark-paid write for real.
 */
async function ensureChildRows(
  tx: Prisma.TransactionClient,
  booking: { id: string; agreedPriceCents: number },
  destinationUrl: string,
  status: BookingStatus,
): Promise<void> {
  const needsTrackedLink = status !== BookingStatus.INVITED && status !== BookingStatus.DECLINED;
  const needsPost =
    status === BookingStatus.DRAFT_READY ||
    status === BookingStatus.SCHEDULED ||
    status === BookingStatus.LIVE ||
    status === BookingStatus.PAID;
  const isPublished = status === BookingStatus.LIVE || status === BookingStatus.PAID;
  const needsPayout = status === BookingStatus.PAID;

  if (needsTrackedLink) {
    await tx.trackedLink.upsert({
      where: { bookingId: booking.id },
      create: { bookingId: booking.id, slug: trackedLinkSlug(), destinationUrl },
      update: {},
    });
  } else {
    await tx.trackedLink.deleteMany({ where: { bookingId: booking.id } });
  }

  if (needsPost) {
    await tx.post.upsert({
      where: { bookingId: booking.id },
      create: {
        bookingId: booking.id,
        content: DRAFT_CONTENT,
        linkedinUrl: isPublished
          ? `https://www.linkedin.com/posts/activity-${randomBytes(5).readUIntBE(0, 5)}`
          : null,
        publishedAt: isPublished ? new Date() : null,
      },
      update: {
        content: DRAFT_CONTENT,
        linkedinUrl: isPublished
          ? `https://www.linkedin.com/posts/activity-${randomBytes(5).readUIntBE(0, 5)}`
          : null,
        publishedAt: isPublished ? new Date() : null,
      },
    });
  } else {
    await tx.post.deleteMany({ where: { bookingId: booking.id } });
  }

  if (needsPayout) {
    await tx.payout.upsert({
      where: { bookingId: booking.id },
      create: { bookingId: booking.id, amountCents: booking.agreedPriceCents, status: "PAID", paidAt: new Date() },
      update: { amountCents: booking.agreedPriceCents, status: "PAID", paidAt: new Date() },
    });
  } else {
    await tx.payout.deleteMany({ where: { bookingId: booking.id } });
  }
}

async function main(): Promise<void> {
  const target = describeTarget();
  console.log(`Database: ${target.label}`);
  if (target.isLocal && !process.argv.includes("--local")) {
    console.log("");
    console.log("This looks like a LOCAL database, not the deployed one.");
    console.log("On Windows the environment variable has to be set the way your shell expects:");
    console.log('  PowerShell   $env:DATABASE_URL="<DATABASE_PUBLIC_URL>"');
    console.log("  cmd.exe      set DATABASE_URL=<DATABASE_PUBLIC_URL>");
    console.log('  Git Bash     export DATABASE_URL="<DATABASE_PUBLIC_URL>"');
    console.log("");
    console.log("Refusing to continue. Pass --local if you really do mean your dev database.");
    process.exitCode = 1;
    return;
  }

  const demoBrand = await resolveDemoBrand();
  const demoCreator = await resolveDemoCreator();
  console.log(`Demo brand:   ${demoBrand.name}`);
  console.log(`Demo creator: ${demoCreator.displayName}`);
  console.log("");

  // Every campaign, cheapest-to-book-into first (LIVE, then DRAFT, then
  // COMPLETED), so a fresh row lands somewhere that reads as active if a
  // choice exists at all.
  const allCampaigns = (
    await prisma.campaign.findMany({ orderBy: { createdAt: "asc" } })
  ).sort(
    (a, b) => (CAMPAIGN_STATUS_PRIORITY[a.status] ?? 9) - (CAMPAIGN_STATUS_PRIORITY[b.status] ?? 9),
  );
  const ledgerlyCampaigns = allCampaigns.filter((c) => c.companyId === demoBrand.id);
  if (ledgerlyCampaigns.length === 0) {
    throw new Error(`${demoBrand.name} has no campaigns. Is this the right database?`);
  }

  const allCreators = await prisma.creatorProfile.findMany({ orderBy: { createdAt: "asc" } });
  const costByCreatorId = new Map(allCreators.map((c) => [c.id, c.postCostCents]));

  const newBookings: PlannedBooking[] = [];
  const conversions: PlannedConversion[] = [];
  // (campaignId:creatorId) pairs this run has already claimed, so two
  // targets in the same run never plan into the same free slot twice.
  const reserved = new Set<string>();
  const convertedBookingIds = new Set<string>();

  // --- Creator side: INVITED, ACCEPTED, SCHEDULED -------------------------
  const creatorBookings = await prisma.booking.findMany({
    where: { creatorProfileId: demoCreator.id },
  });
  const creatorStatusesPresent = new Set(creatorBookings.map((b) => b.status));
  const creatorBlockedCampaignIds = new Set(
    creatorBookings.filter((b) => b.status !== "DECLINED").map((b) => b.campaignId),
  );

  for (const status of CREATOR_TARGETS) {
    if (creatorStatusesPresent.has(status)) continue;

    const freeCampaign = allCampaigns.find(
      (c) => !creatorBlockedCampaignIds.has(c.id) && !reserved.has(`${c.id}:${demoCreator.id}`),
    );
    if (freeCampaign) {
      reserved.add(`${freeCampaign.id}:${demoCreator.id}`);
      newBookings.push({
        description: `${demoCreator.displayName} — new ${status} booking in "${freeCampaign.name}"`,
        campaignId: freeCampaign.id,
        destinationUrl: freeCampaign.destinationUrl,
        creatorProfileId: demoCreator.id,
        postCostCents: costByCreatorId.get(demoCreator.id) ?? 20_000,
        status,
      });
      continue;
    }

    const convertible = creatorBookings.find(
      (b) =>
        b.status !== "DECLINED" &&
        b.status !== "PAID" &&
        !convertedBookingIds.has(b.id) &&
        !CREATOR_TARGETS.includes(b.status),
    );
    if (!convertible) {
      throw new Error(
        `No free campaign and nothing convertible for ${demoCreator.displayName} -> ${status}. ` +
          "Every campaign already has a non-declined booking for this creator in a status this script needs to keep.",
      );
    }
    convertedBookingIds.add(convertible.id);
    const campaign = allCampaigns.find((c) => c.id === convertible.campaignId);
    if (!campaign) throw new Error(`Campaign "${convertible.campaignId}" not found`);
    conversions.push({
      description: `${demoCreator.displayName} — convert existing booking (was ${convertible.status}) in "${campaign.name}" to ${status}`,
      bookingId: convertible.id,
      destinationUrl: campaign.destinationUrl,
      agreedPriceCents: convertible.agreedPriceCents,
      status,
    });
  }

  // --- Brand side: DRAFT_READY, LIVE, any creator -------------------------
  const brandBookings = await prisma.booking.findMany({
    where: { campaign: { companyId: demoBrand.id } },
  });
  const brandStatusesPresent = new Set(brandBookings.map((b) => b.status));
  const brandBlockedPairs = new Set(
    brandBookings
      .filter((b) => b.status !== "DECLINED")
      .map((b) => `${b.campaignId}:${b.creatorProfileId}`),
  );

  for (const status of BRAND_TARGETS) {
    if (brandStatusesPresent.has(status)) continue;

    let placed = false;
    for (const campaign of ledgerlyCampaigns) {
      const creator = allCreators.find(
        (c) => !brandBlockedPairs.has(`${campaign.id}:${c.id}`) && !reserved.has(`${campaign.id}:${c.id}`),
      );
      if (!creator) continue;
      reserved.add(`${campaign.id}:${creator.id}`);
      newBookings.push({
        description: `${creator.displayName} — new ${status} booking in "${campaign.name}" (${demoBrand.name})`,
        campaignId: campaign.id,
        destinationUrl: campaign.destinationUrl,
        creatorProfileId: creator.id,
        postCostCents: costByCreatorId.get(creator.id) ?? 20_000,
        status,
      });
      placed = true;
      break;
    }
    if (placed) continue;

    const convertible = brandBookings.find(
      (b) =>
        b.status !== "DECLINED" &&
        b.status !== "PAID" &&
        !convertedBookingIds.has(b.id) &&
        !BRAND_TARGETS.includes(b.status),
    );
    if (!convertible) {
      throw new Error(
        `No free (campaign, creator) pair and nothing convertible for ${demoBrand.name} -> ${status}.`,
      );
    }
    convertedBookingIds.add(convertible.id);
    const campaign = allCampaigns.find((c) => c.id === convertible.campaignId);
    if (!campaign) throw new Error(`Campaign "${convertible.campaignId}" not found`);
    conversions.push({
      description: `${demoBrand.name} — convert existing booking (was ${convertible.status}) in "${campaign.name}" to ${status}`,
      bookingId: convertible.id,
      destinationUrl: campaign.destinationUrl,
      agreedPriceCents: convertible.agreedPriceCents,
      status,
    });
  }

  if (newBookings.length === 0 && conversions.length === 0) {
    console.log("Nothing to do. Every target status already has a real row.");
    return;
  }

  console.log(`${APPLY ? "Applying" : "Would apply"} ${newBookings.length + conversions.length} change(s):`);
  for (const b of newBookings) console.log(`  [new]     ${b.description}`);
  for (const c of conversions) console.log(`  [convert] ${c.description}`);

  if (!APPLY) {
    console.log("");
    console.log("Dry run. Nothing was written. Re-run with --apply to do it.");
    return;
  }

  await prisma.$transaction(async (tx) => {
    for (const plan of newBookings) {
      const booking = await tx.booking.create({
        data: {
          campaignId: plan.campaignId,
          creatorProfileId: plan.creatorProfileId,
          agreedPriceCents: plan.postCostCents,
          deliverable: DELIVERABLE,
          status: plan.status,
          initiatedBy: "BRAND",
        },
      });
      await ensureChildRows(tx, booking, plan.destinationUrl, plan.status);
    }

    for (const plan of conversions) {
      const booking = await tx.booking.update({
        where: { id: plan.bookingId },
        data: { status: plan.status },
      });
      await ensureChildRows(tx, booking, plan.destinationUrl, plan.status);
    }
  });

  console.log("");
  console.log(`Done. ${newBookings.length} new booking(s), ${conversions.length} conversion(s).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());
