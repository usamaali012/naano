# RECON.md — the live naano product

Observed directly by walking the logged-in brand side of naano.com on
2026-09-10, as the brand "Attio". This supersedes `docs/PRODUCT.md` wherever the
two disagree. Screenshots are in `/recon`.

The creator side has not been walked yet. Everything below is the brand side.

---

## 1. Onboarding

Five screens, and the third is the interesting one.

1. `/register` — role choice. Two large cards: "I'm a creator" and "I'm a brand",
   each with one line of explanation. Right half of the screen is a solid blue
   panel: "One platform. Two sides."
2. `/register?role=saas` — three auth options: LinkedIn, Google, email.
3. `/onboarding-brand` step 1 of 3 — one field, your website URL, and a button
   "Analyze my website". Copy promises 20 to 40 seconds.
4. Analysis screen — a live checklist ticking through: reading your website,
   extracting product signals, identifying your ICP, preparing your brand
   profile.
5. Step 2 of 3 — "Value prop & ICP". An editable value proposition textarea
   (4 to 6 sentences, pre-filled from the site), three numbered ICP cards with
   a title and description each, and a "Starter creator brief" preview card
   with a green Ready badge showing PRODUCT and AUDIENCE side by side. A note
   says creators can adapt the angle to their expertise while keeping every
   product claim factual. Button: "Continue to AI Matching".

Step 3 is the marketplace with a three-step coachmark tour.

**Build implication.** The ICP extraction is the spine of the whole product:
everything downstream (fit scores, ranking, the brief) derives from those three
ICPs. Reproduce the flow with a deterministic transform over a small set of
known domains. Do not wire a real LLM unless everything else is finished.

---

## 2. App shell

- Left rail, collapsible between icon-only (~72px) and expanded (~210px) with
  labels. Seven items: Overview, Creators, Campaigns, Collaborations, Results,
  Messages, Billing.
- Brand switcher pill at the top of the rail showing the current brand. One
  account can hold several brands.
- Top bar, right side: wallet balance chip, EN/FR toggle, an activation progress
  ring showing 2/3 with a rotating "Get started" hint, a notifications bell with
  an unread count, an avatar.
- Top bar, left: a "NAANO MCP / Connect" pill. They ship an MCP server so the
  product can be driven from an AI assistant.
- A persistent floating command bar pinned bottom-centre on every screen, with a
  rotating placeholder ("What can I help you find?", "What would you like to
  do?") and a voice input icon.
- Dismissible "Good to know" coach cards bottom-right, and a numbered tour
  overlay with Skip / Next.

**Build implication.** The floating AI bar appears on every screen and is a
strong visual signature. Rendering it as a non-functional element would be
obvious. Either make it do something real (route to filtered marketplace
results) or leave it out entirely and say why in the walkthrough.

---

## 3. Overview

- Greeting: "Hello Usama" with a wave, then "Here is what is happening for Attio
  on Naano." Primary button: "New campaign".
- Four stat cards: creators activated, posts published, profiles engaged,
  impressions.
- **To do** card, subtitled "Priority actions". Rows with a circular checkbox, a
  label, a status badge, and a chevron. Badges observed: amber "Blocked" (top up
  your wallet), grey "Suggested" (book a call, find new creators). "See all"
  link.
- **Recently engaged companies** panel, headed "ICP accounts in your target".
  Empty state: "No company has engaged yet."
- **Messages** panel, subtitled "Waiting on your reply". Empty: "No conversation
  yet."
- **New creators** carousel with a count badge, subtitled "Profiles that fit your
  buyers". Cards show avatar, name, vertical string, a blue "90% ICP" pill,
  "from EUR X /post", and an Add button. "Explore" link to the right.
- Bottom banner: book a free call with a Naano expert, with the expert's photo
  and a green availability dot.

---

## 4. Creators (marketplace)

A toggle at the top switches two modes.

**AI Matching.** "Hey Attio, let's find the right creators for you." A single
input, "Ask Nao a question, or find creators...", above a list of suggested
prompts such as "Find creators who already reach VP Sales" and "Build a balanced
creator shortlist for Attio".

**Creator Marketplace.** The browsable grid.

- Title "All creators" with the explainer: creators are shown most to least
  relevant, using sector fit first and verified performance statistics to refine
  the order.
- Tabs: All creators (928) and Shortlist (0).
- A "Ranked for your company" strip repeating the ranking logic.
- A live progress bar: "Naano is improving your shortlist / AI is refining your
  matches using recent creator performance… Comparing creator evidence with your
  ICP…"
- Search box. Sort by, with exactly four options: Best match, Price low to high,
  Most followers, Best engagement.
- Section header "Top ranked creators", with the note "The 40 strongest profiles
  according to your sector and performance signals".

### Filters

| Filter | Control |
|---|---|
| Industry | Searchable multi-select with checkboxes. Observed: AI, Data, Marketing, SEO, Content, Sales, more below fold |
| Country | Dropdown |
| Price | Range slider sitting on a histogram of the real price distribution. EUR 50 to EUR 22,500+ |
| Filters | Separate "Performance filters" panel |

Performance filters panel: maximum CPM, minimum median views, minimum followers,
maximum followers, minimum engagement (%), posted recently (time select).
Buttons: Clear, Apply filters. Two pieces of copy worth reproducing in spirit:

- "These filters hide creators; matching scores stay unchanged."
- "Creators with unavailable performance data remain visible."

### Creator card

Top row: multi-select checkbox, LinkedIn badge, star (shortlist toggle), Book
button. Cloud-image header band. Circular avatar overlapping it. Name, then a
vertical string ("AI · Marketing") with a country code. Then a four-cell metric
strip, then a "View profile" row with a right arrow.

Metrics, in order: **followers, median views, CPM, post cost.**

CPM is derived, never entered. The UI states the formula literally when you
expand "How pricing is calculated": `188 € ÷ 17.3K × 1,000`.

Book and View profile open the same modal. Book is not a separate flow.

---

## 5. Creator profile modal

Header: avatar, name, "AI · Marketing · LinkedIn creator", star, close.
Three tabs, and a persistent booking rail down the right side.

**Overview tab**
- Short blurb: review this creator's audience and recent content before booking.
- Two check chips: "48% in observed audience · Marketing", "17.3K typical reach".
- Audience snapshot: job title and seniority, each as a segmented bar with four
  labelled percentages. Captioned "Estimated from 45 recent public engagers".
- Content performance: a "Reach across recent posts" sparkline labelled
  "Oldest → newest" with date bounds, beside a real recent post card.
- A "Professional profile" accordion.

**Audience tab**
- "Audience composition / Top segments by dimension; each bar compares like with
  like."
- Four dimension cards: job title, seniority, industry, audience geography. Each
  with a stacked bar and four labelled percentages.
- Footer: "See the full audience · 18 audience signals" (expandable).
- Right-aligned caption: "Estimated from 45 recent public engagers", "Observed
  engaged profiles · 45".

**Content tab**
- Left column "Content signals": topic chips (AI, Marketing, SaaS), then a small
  grid: latest post date, "19 posts observed in 30 days" (observed publishing
  activity), typical range, posts analyzed. Then the reach sparkline.
- Right column: a LinkedIn post carousel, "1 of 5", with prev/next arrows. Full
  post text with "See full post" expander, "Open original" external link, and an
  engagement row (views, reactions, comments, reposts).

**Booking rail (always visible)**
- "Book this creator"
- Two radio options: Single post EUR 188, Bundle · 5 EUR 625
- Typical reach, Estimated CPM, Posts analyzed
- "How pricing is calculated" expander showing the formula
- Primary CTA: "Collaborate with <first name>"
- Below it: "Secure booking · Creator approves first"

**Build implication.** This modal is the densest, most designed surface in the
product. It is what a reviewer will linger on. If you build one thing properly,
build this.

---

## 6. Campaigns

**List.** Tabs All / Active / Draft / Completed, campaign count on the right,
"Create a campaign" button. Each card: brand logo, status dot with label,
"CREATED ON <date>" top right, title, brief excerpt, three stats (creators,
published, committed budget), and a footer with "Open campaign" and "My brief".
The create card reads: "Launch a new campaign in 2 minutes — with AI, the Naano
team, or an existing link."

**Detail.** Back link, title, status pill, a campaign switcher dropdown, and an
"Invite a creator" button which simply routes to the marketplace. Four tabs.

### Brief tab

Headed "Campaign brief" with a "Naano AI" badge and an "Edit the brief" action.
Sections in order:

1. **Context & objective** — a paragraph describing the product and intended
   audience, ending with instruction to the creator: introduce the product
   through your own expertise, adapt the angle, keep every claim grounded in the
   confirmed company profile.
2. **Audience & tone** — with a Tone subsection: "Clear, useful and natural.
   Keep the creator's own voice rather than following a script."
3. **Editorial rules** — two columns, Do and Avoid.
   Do: use only confirmed information; connect the product to a practical
   audience question; disclose the sponsored partnership clearly.
   Avoid: do not invent customers, results, figures or features; do not force an
   endorsement or promise outcomes.
4. **Angles & post examples** — numbered entries (01, 02...), each with an angle
   title, a quoted one-line guidance in a left-bordered block, a paragraph, and
   an expandable "Post example".

Note: the numbered markers here are legitimate because the angles are a genuine
enumerated list, not decoration.

### Shortlist tab

Empty state: "Shortlist / Save creators from the marketplace to build your
shortlist." with a "Find creators" button.

### Analytics tab

Nested tabs Analytics / Leads / Posts, then the same metric layout as the global
Results page, scoped to this campaign, with "Since the campaign started" as the
period caption instead of "last 30 days".

---

## 7. Collaborations

Exists both globally and as a campaign tab.

- Header stats on the right: N collaborations, EUR X committed, N to do.
- A campaign filter select and a search box.
- Status tabs with counts: All, Active, **Invitations received**, **Invitations
  sent**, To do, Completed.
- Table columns: Creator, Campaign, Status, Next action, Due date, Amount,
  Updated. Header row has a select-all checkbox.
- Pagination with a "Rows per page" select defaulting to 10.
- Empty: "No collaborations yet, invite a creator from the Marketplace."

**Build implication.** "Invitations received" versus "invitations sent" means
invites flow both directions: a creator can pitch a brand, not only accept. The
`Booking` model needs an `initiatedBy` field. This was missed in the first
recon.

The "Next action" column is the product telling each side whose turn it is.
That is a nicer pattern than a bare status and it is cheap to implement as a
derived value from status plus role.

---

## 8. Results

Tabs: Analytics, Leads, Posts. A campaign filter select ("All campaigns").

Three metric cards with explanatory captions:
- Est. reach — "No published posts yet"
- Qualified clicks — "last 30 days"
- Committed budget — "0 bookings"

Below:
- **Performance over time** — "Daily clicks · last 12 days", with a period
  selector (Month), dated axis.
- **Post performance** — "Latest metrics collected from...", listing posts,
  reactions, comments, with a "View posts" link.
- **Measure site conversions** — an info banner: "Connect the pixel to add
  visits, sign-ups and revenue to your post results." with "Install the pixel".
- **Attribution by creator** — a table with Creator and Clicks columns.
- **More metrics & attribution details** — an expandable section.

**Build implication.** "Qualified clicks" rather than raw clicks, and a
conversion pixel as a separate layer above click tracking. Your `ClickEvent`
table already supports the first. The pixel is a natural thing to name in the
cutting list rather than build.

---

## 9. Billing

- "Billing / Manage your budget, plan and invoices" with a "Need help?" button.
- Available balance card: large EUR figure, "Ready to spend across your
  campaigns", an "Add budget" primary button and two quick-amount chips,
  + EUR 2,500 and + EUR 10,000.
- Invoices section with tabs All / Top-ups / Bookings and a table: Reference,
  Date, Type, Amount, Status, Actions.
- Empty: "No invoices or entries yet."

The wallet is prepaid. Bookings commit against a balance, which is why "top up
your wallet" appears as Blocked on the Overview to-do list.

---

## 10. Data model corrections

Against the current schema:

| Field | Change |
|---|---|
| `avgImpressions` | Drop. Replace with `medianViews`. |
| `pricePerPostCents` | Rename to `postCostCents`. |
| — | Add `bundle5PriceCents`. |
| — | CPM computed as `postCostCents / medianViews * 1000`. Never stored. |
| `audienceFitScore` | Already agreed: move off the creator, compute per (creator, campaign). |
| — | Add `Icp`. A campaign has up to three. |
| — | Add `Booking.initiatedBy` (BRAND or CREATOR) for two-way invitations. |
| — | Add `AudienceSegment`: creator, dimension (JOB_TITLE, SENIORITY, INDUSTRY, GEOGRAPHY), label, percentage. |
| — | Add `CreatorPost`: creator, content, publishedAt, views, reactions, comments, reposts, externalUrl. |
| — | `Creator.observedEngagerCount` and `postsAnalyzed`, so the "estimated from N" captions are real. |

Seed calibration: median views should land at roughly 20 to 100 percent of
follower count, and the resulting CPM should fall in the EUR 10 to 30 band,
which is where the real product sits.

---

## 11. Build order

Phases 1 and 2 are the ones that decide the outcome. Everything after is
addition.

**Phase 1 — data truth.** Schema and seed per section 10. Blocks everything.

**Phase 2 — marketplace and creator modal.** The grid with the real four
metrics, all four filters, four sort options, shortlist, and the three-tab modal
with the booking rail. This is where the UX score is won.

**Phase 3 — campaign and brief.** Campaign list and detail, the four brief
sections, invite a creator creating a Booking.

**Phase 4 — creator side.** Invitations in and out, accept and decline, tracked
link issued on accept, earnings view.

**Phase 5 — results.** Metric cards, performance over time, attribution by
creator, all aggregating over `ClickEvent`.

**Phase 6 — ship.** Reserve three hours minimum. Deploy, demo entry on `/`,
walkthrough video, README notes.

---

## 12. Cutting list

State these in the walkthrough. Product judgement is scored, and naming what you
deliberately left out is how you show it.

- Agency side entirely
- Real payment rails (wallet UI can exist with fake balances)
- The AI Matching conversational mode
- The conversion pixel
- LinkedIn OAuth and any real LinkedIn API
- Messages
- The Leads tab and ICP account enrichment
- The MCP server
- i18n, the blog, the SEO page tree
