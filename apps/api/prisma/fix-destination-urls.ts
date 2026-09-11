/**
 * One-off forward data fix, not a schema migration. The seed originally set
 * campaign destinationUrl to subdomains of example.com (ledgerly.example.com,
 * vertice-analytics.example.com) that don't resolve — clicking a tracked link
 * hit a browser DNS error instead of a landing page. seed.ts now uses
 * example.com itself, which does resolve, but that only affects a *fresh*
 * seed. It does not touch:
 *   - Campaign rows a prior seed already created in a running database, or
 *   - TrackedLink rows, which copy destinationUrl from their campaign once at
 *     accept time (apps/api/src/bookings/bookings.service.ts) and never read
 *     it live afterward.
 * This script updates both tables in place, matched on the exact old URLs so
 * it can't touch anything else. Idempotent — rerunning it after the URLs are
 * already fixed matches zero rows. See docs/DECISIONS.md for why this is a
 * targeted UPDATE rather than a reseed (reseeding isn't safe or idempotent
 * against a database that already has this data, and CLAUDE.md rules out
 * `prisma migrate reset` once a remote database exists).
 *
 * Run once against the target database via `railway run` (same pattern as
 * prisma:seed / prisma:migrate — see docs/DECISIONS.md Session B), from
 * apps/api:
 *   railway run npx ts-node prisma/fix-destination-urls.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const URL_FIXES: Array<{ from: string; to: string }> = [
  {
    from: "https://vertice-analytics.example.com/lp/forecasting",
    to: "https://example.com/lp/forecasting",
  },
  {
    from: "https://vertice-analytics.example.com/lp/integrations",
    to: "https://example.com/lp/integrations",
  },
  {
    from: "https://ledgerly.example.com/lp/embedded-finance",
    to: "https://example.com/lp/embedded-finance",
  },
  {
    from: "https://ledgerly.example.com/lp/payouts",
    to: "https://example.com/lp/payouts",
  },
];

async function main(): Promise<void> {
  let campaignsFixed = 0;
  let trackedLinksFixed = 0;

  for (const { from, to } of URL_FIXES) {
    const campaigns = await prisma.campaign.updateMany({
      where: { destinationUrl: from },
      data: { destinationUrl: to },
    });
    const trackedLinks = await prisma.trackedLink.updateMany({
      where: { destinationUrl: from },
      data: { destinationUrl: to },
    });
    campaignsFixed += campaigns.count;
    trackedLinksFixed += trackedLinks.count;
    console.log(`${from} -> ${to}: ${campaigns.count} campaign(s), ${trackedLinks.count} tracked link(s)`);
  }

  console.log(`Done: ${campaignsFixed} campaign(s), ${trackedLinksFixed} tracked link(s) updated.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
