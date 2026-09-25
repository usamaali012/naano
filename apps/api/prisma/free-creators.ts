/**
 * Demo-data maintenance, not a schema migration.
 *
 * The seed gives the demo brand's active campaign a booking against almost
 * every creator, and `POST /bookings` refuses a second non-declined booking
 * for the same creator + campaign. After a few walkthroughs that leaves zero
 * bookable creators, so a reviewer who clicks "Collaborate with ..." on the
 * live site gets "Already booked" on all 40 of them and never sees the core
 * loop work. This frees a handful again.
 *
 * What it does, in one transaction:
 *   picks the creators with the FEWEST clicks in the active campaign, and
 *   removes their bookings against that campaign (with the TrackedLink,
 *   ClickEvents, Post and Payout hanging off each one).
 *
 * Lowest-clicks-first is deliberate. The Results screen aggregates clicks
 * across every campaign, so a creator who also has bookings in Summer Payouts
 * keeps their row and most of their number. Taking the quietest rows first
 * keeps both the marketplace badges and the attribution table looking like
 * a product in use.
 *
 * Scope guards: only the resolved campaign is ever touched, DECLINED rows are
 * left alone (they already permit a rebooking), and a creator is only counted
 * as freed when every non-declined booking they have in that campaign goes.
 *
 * DRY RUN BY DEFAULT. It prints the plan and writes nothing unless you pass
 * --apply.
 *
 * Run from apps/api. `railway run` injects the INTERNAL database host, which
 * a laptop cannot resolve, so set DATABASE_URL to the public URL yourself:
 *
 *   # see the plan, change nothing
 *   DATABASE_URL="<DATABASE_PUBLIC_URL>" npx ts-node prisma/free-creators.ts
 *
 *   # actually do it
 *   DATABASE_URL="<DATABASE_PUBLIC_URL>" npx ts-node prisma/free-creators.ts --apply
 *
 *   # a different number
 *   DATABASE_URL="<DATABASE_PUBLIC_URL>" npx ts-node prisma/free-creators.ts --count=15 --apply
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Prisma falls back to apps/api/.env when DATABASE_URL is not in the
 * environment, and that points at a local development database. Printing the
 * host (and refusing localhost unless you ask for it) is the difference
 * between freeing creators on the live site and freeing them on your laptop
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

/** The seeded demo brand. Same constant as apps/api/src/auth/auth.service.ts. */
const DEMO_BRAND_EMAIL = "growth@ledgerly.example.com";

const APPLY = process.argv.includes("--apply");
const COUNT = (() => {
  const arg = process.argv.find((a) => a.startsWith("--count="));
  const n = arg ? Number.parseInt(arg.split("=")[1] ?? "", 10) : 10;
  return Number.isFinite(n) && n > 0 ? n : 10;
})();

/**
 * Same resolution the app uses (CampaignsService.getActiveForCompany): the
 * most recent LIVE campaign for the brand, falling back to the most recent
 * campaign of any status. Freeing creators in any other campaign would not
 * change what the marketplace lets you book.
 */
async function resolveActiveCampaign() {
  const user = await prisma.user.findUnique({
    where: { email: DEMO_BRAND_EMAIL },
    include: { company: true },
  });
  if (!user?.company) {
    throw new Error(`No company found for ${DEMO_BRAND_EMAIL}. Is this the right database?`);
  }
  const companyId = user.company.id;

  const live = await prisma.campaign.findFirst({
    where: { companyId, status: "LIVE" },
    orderBy: { createdAt: "desc" },
  });
  const campaign =
    live ??
    (await prisma.campaign.findFirst({
      where: { companyId },
      orderBy: { createdAt: "desc" },
    }));
  if (!campaign) throw new Error(`No campaigns found for ${user.company.name}.`);
  return { company: user.company, campaign };
}

async function main(): Promise<void> {
  const target = describeTarget();
  console.log(`Database:        ${target.label}`);
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

  const { company, campaign } = await resolveActiveCampaign();

  const bookings = await prisma.booking.findMany({
    where: { campaignId: campaign.id, status: { not: "DECLINED" } },
    include: {
      creatorProfile: { select: { id: true, displayName: true } },
      trackedLink: { select: { id: true, _count: { select: { clickEvents: true } } } },
    },
  });

  // Group by creator. A creator is only bookable again once every one of
  // their non-declined bookings in this campaign is gone, so they are freed
  // or not freed as a unit.
  type Row = (typeof bookings)[number];
  const byCreator = new Map<string, { name: string; rows: Row[]; clicks: number }>();
  for (const b of bookings) {
    const key = b.creatorProfileId;
    const entry = byCreator.get(key) ?? {
      name: b.creatorProfile.displayName,
      rows: [],
      clicks: 0,
    };
    entry.rows.push(b);
    entry.clicks += b.trackedLink?._count.clickEvents ?? 0;
    byCreator.set(key, entry);
  }

  const totalCreators = await prisma.creatorProfile.count();
  const blocked = byCreator.size;

  console.log(`Company:         ${company.name}`);
  console.log(`Active campaign: ${campaign.name} (${campaign.status})`);
  console.log(`Creators:        ${totalCreators} total, ${blocked} blocked, ${totalCreators - blocked} bookable now`);
  console.log("");

  const plan = [...byCreator.entries()]
    .sort((a, b) => a[1].clicks - b[1].clicks || a[1].name.localeCompare(b[1].name))
    .slice(0, COUNT);

  if (plan.length === 0) {
    console.log("Nothing to free. Every creator is already bookable.");
    return;
  }

  console.log(`${APPLY ? "Freeing" : "Would free"} ${plan.length} creator(s), quietest first:`);
  for (const [, e] of plan) {
    const statuses = e.rows.map((r) => r.status).join(", ");
    console.log(`  ${e.name.padEnd(22)} ${String(e.rows.length).padStart(2)} booking(s) [${statuses}]  ${e.clicks} click(s)`);
  }
  const clicksLost = plan.reduce((sum, [, e]) => sum + e.clicks, 0);
  console.log("");
  console.log(`Click events removed: ${clicksLost}`);
  console.log(`Bookable afterwards:  ${totalCreators - blocked + plan.length} of ${totalCreators}`);

  if (!APPLY) {
    console.log("");
    console.log("Dry run. Nothing was written. Re-run with --apply to do it.");
    return;
  }

  const bookingIds = plan.flatMap(([, e]) => e.rows.map((r) => r.id));
  const trackedLinkIds = plan.flatMap(([, e]) =>
    e.rows.map((r) => r.trackedLink?.id).filter((id): id is string => Boolean(id)),
  );

  await prisma.$transaction(async (tx) => {
    if (trackedLinkIds.length > 0) {
      await tx.clickEvent.deleteMany({ where: { trackedLinkId: { in: trackedLinkIds } } });
      await tx.trackedLink.deleteMany({ where: { id: { in: trackedLinkIds } } });
    }
    // Post and Payout are optional one-to-ones with no cascade declared, so
    // they have to go before the booking they point at.
    await tx.post.deleteMany({ where: { bookingId: { in: bookingIds } } });
    await tx.payout.deleteMany({ where: { bookingId: { in: bookingIds } } });
    await tx.booking.deleteMany({ where: { id: { in: bookingIds } } });
  });

  console.log("");
  console.log(`Done. Removed ${bookingIds.length} booking(s). ${plan.length} creator(s) are bookable again.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());
