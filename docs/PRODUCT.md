# PRODUCT.md — what naano.com is

Source: naano.com homepage, /creators, /llms.txt (fetched 2026-09-10).
This file is the domain reference. Read it once. Do not re-fetch naano.com.

## One line

A B2B LinkedIn creator marketplace. Companies book vetted LinkedIn creators to
publish sponsored posts at a flat fee per post set by the creator, and every post
carries a tracked CTA link so clicks and leads attribute back to the creator.

## Sides of the marketplace

Three, but the clone should treat COMPANY and CREATOR as first class and treat
AGENCY as a later stretch if there is time.

- **Company (brand)** — creates campaigns, browses creators, sends collaboration
  requests, funds posts, watches the attribution dashboard.
- **Creator** — sets their own price per post, receives collaboration requests,
  accepts or declines, publishes the post, gets paid.
- **Agency** — manages campaigns on behalf of multiple companies. Out of scope
  unless the brief asks for it.

## Core loop

1. Company creates a campaign brief (objective, key messages, creator guidelines,
   destination URL).
2. Company browses the marketplace, filters creators by vertical, follower tier,
   country, price. Each creator shows an audience-fit score.
3. Company sends a collaboration request to chosen creators at the creator's
   listed price.
4. Creator sees the request with the deliverable and deadline, then accepts or
   declines.
5. On accept, the platform issues a tracked link for that creator on that campaign.
6. Creator publishes on LinkedIn using the tracked CTA link.
7. Every click on the tracked link is recorded and attributed to
   (campaign, creator, post).
8. Dashboard rolls clicks up into impressions, clicks, CTR, leads, spend, cost per
   click, attributed pipeline.
9. Creator is paid out per post. Naano handles contract, invoice, payout.

Booking status progression seen on the live site:
`INVITED -> ACCEPTED -> DRAFT_READY -> SCHEDULED -> LIVE -> PAID`, with `DECLINED`
as a terminal branch from INVITED.

## Pricing model (current)

- Flat fee **per post**, set by each creator. From EUR 20 at entry level, up to
  EUR 400-1500 per post for high-tier creators in scarce verticals.
- Company plans: Self-Serve EUR 0/month, Managed EUR 700/month.
- Campaign spend is separate from the plan fee.
- NOTE: naano used to bill per click. Their historical Q1 2026 figures are
  per-click. The product today is per post. Build per post.

## Creator attributes that matter

vertical (sales, RevOps, devtools, HR-tech, product, marketing-ops, fintech,
vertical SaaS), follower count (roughly 1k to 500k), country, language,
price per post, average impressions, engagement rate, audience-fit score
against the campaign's target buyer.

Marketplace scale claims on the live site: 2,000+ vetted creators, 100 countries,
5M+ impressions, 30k+ leads, 5k+ posts published, EUR 500 average per deal,
payout within 24h.

## Metrics shown on dashboards

Per post: impressions, clicks, leads.
Per campaign: attributed pipeline (currency), total views, total leads, spend.
Creator side: views, clicks, engagement, earnings, payout status.

Real examples from the site, useful as seed data shape:
- 42.8K impressions / 312 clicks / 18 leads
- 9K / 100 / 50
- 20K / 350 / 80
- 100K / 1,600 / 320

## The part that is actually interesting to build

The tracked link and its attribution chain. A `GET /r/:slug` endpoint that records
a click event with timestamp, referrer, user agent, then 302s to the campaign's
destination URL. Everything on the dashboard is an aggregate over that table.

Build that early. It is the thing that separates a working clone from a static
marketing page.

## Deliberately out of scope unless the brief asks

Real LinkedIn OAuth or API integration, real payment rails, AI brief generation,
the blog and SEO page tree, i18n (site is EN + FR), agency side.
