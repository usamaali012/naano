# RECON-CREATOR.md — the real creator side, observed directly

Observed 2026-09-25 on naano.com with a real creator account, fresh signup, zero
data. This closes the gap the README admits to: the creator side was previously
a considered guess. It is not any more.

Supersedes any assumption in PRODUCT.md about the creator experience.

## Shape

Creator Studio at `naano.com/creator`, hash-routed, collapsed icon rail that
expands to labels on hover. **Ten** nav items:

| # | Section | Hash | What it is |
|---|---|---|---|
| 1 | Overview | `#home` | Dashboard |
| 2 | My card | `#profile` | The creator's public storefront + editor |
| 3 | Opportunities | `#opportunities` | Open brand campaigns to apply to |
| 4 | Collaborations | `#collabs` | The creator's booking pipeline |
| 5 | Boosts | `#linkedin-boosts` | Brand sponsors an existing organic post. Marked **Pilot** |
| 6 | Analytics | `#analytics` | Imported public LinkedIn performance |
| 7 | Community | — | Slack invite + LinkedIn "Deal Link" |
| 8 | Earnings | `#earnings` | Revenue and withdrawals |
| 9 | Affiliate program | — | Referral scheme |
| 10 | Messages | — | Threads with brands |

Top bar: wallet balance (€0), EN/FR toggle, notifications, account avatar.
A floating AI command bar sits at the bottom of every screen.

## Section by section

### Overview
"Creator workspace / Good to see you, Usama / Your creator activity, at a glance."

- Four tiles: Public post reach, Public posts, Public engagements, LinkedIn
  followers. On a new account all four read `—` or `0` with captions like
  "Import in progress".
- "Your creator card" panel: card preview, Open card / Copy card link / Share my card.
- "Your launch guide": 1 of 1 steps complete, "Card and price ready".
- "Recommended opportunities": "The 3 campaigns that best match your audience",
  but gated behind the follower rule.
- "Active collaborations": columns **Brand, Status, Next action, Due, Net**.

### My card
"Your creator storefront / Your Naano card, ready to travel." Edit and Preview.

The card doubles as a referral instrument: "Put it on LinkedIn. Earn when a
brand joins through it." Your share **25%**, reward period **3 months**.
Two prompts: add it as a LinkedIn experience, send it when a brand contacts you.
Card face carries Followers, Est. impressions, Chosen cost.

### Opportunities
"Open brand campaigns - apply, the brand accepts, and the booking is created on
your terms."

**Gated:** "Paid campaigns open at 1,000 followers. You have 0 followers. Keep
posting and come back - re-check your count once a week from Settings."

This is a creator-initiated booking flow. The brand side never shows it.

### Collaborations
"Every step tells you where you stand, what to do, and what happens if you do
nothing."

- Tabs with counts: All, Active, Needs action, Applications sent, Declined, Completed
- Columns: **Brand, Campaign, Status, Performance, Next action, Due date, Your net**
- Empty: "No collaborations yet. Brand invitations and your accepted applications land here."

Note "Your net" (creator sees net of commission) and "Next action" (the system
tells the creator what to do next).

### Boosts (Pilot)
"Boost requests / You stay in control. A brand can sponsor only the exact post
you approve on the selected network."

Network toggle LinkedIn / X. Tabs: Requests, Active boosts, Analytics.
Distinct from a booking: this is paid amplification of an existing organic post.

### Analytics
"Public LinkedIn performance imported for this profile." Network toggle, period
select (All time).

Banner: "Public LinkedIn posts are being imported… Post history and reach will
appear after the public data job completes", plus "0% of imported posts include
reach data".
Tiles: Public posts, Public post reach, Public engagements, LinkedIn followers.
Panels: Recent LinkedIn posts, Public profile summary (followers, posts, posts
with reach data, engagements).

### Community
Slack community invite, plus "Turn your LinkedIn profile into an always-on Deal
Link" with a LinkedIn experience-entry preview.

### Earnings
"Track revenue from your paid collaborations and withdraw available funds."

- Tiles: Total earned (+ "N paid collaborations · €X average"), In transit
  ("transfers usually arrive within 1-7 days"), Available now.
- "Earnings over time": six-month bar chart of net collaboration earnings.
- "Withdraw earnings": payout method radio (Bank transfer, Stripe with a
  Connect Stripe action), amount field, Withdraw all, Confirm withdrawal.

### Affiliate program
"Recommend Naano. Earn for 3 months." Tabs: Invite brands / Invite creators.
25% of Naano's commission. Copy my referral link.

### Messages
Two-pane. Conversation list with search, a pinned NaanoBot thread, composer.
Empty: "No conversations yet - the thread opens with your first Booking."

## Problems worth fixing, with reasons

1. **The follower gate is a dead end.** A new creator sees a padlock, "you have
   0 followers", and nothing else. Recommended opportunities on the Overview is
   gated by the same rule, so two of the first three panels a new creator sees
   are locked. Better: show the campaigns, mark the locked ones, and say what
   unlocks them.

2. **Ten nav items for a creator who has nothing.** Boosts is a pilot. Community
   and Affiliate program are naano's growth surfaces, not the creator's work.
   The nav is ordered by what naano wants, not by what the creator came to do.

3. **The reward period contradicts itself.** Community says 25% "for 6 months".
   Affiliate program and My card both say 3 months.

4. **The first run is four zeros.** Above the fold on Overview: `—`, `0`, `0`,
   `—`. Honest, but it is the first thing a new creator sees.

5. **"Next action" is the best idea in the product and it only exists in a table
   column.** The whole creator side would be better organised around it.

## What the brand side never reveals

- Creators apply to campaigns; bookings are not only brand-initiated.
- Creators see **net**, brands see gross. There is a commission in between.
- Boosts exist as a second, cheaper transaction type.
- Payouts are a real surface with methods, transit states and withdrawals.
