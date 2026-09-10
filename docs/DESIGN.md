# DESIGN.md — visual constraints

Read before writing any component. These are constraints, not suggestions.
Derived from the live naano.com brand app, observed 2026-09-10.

The goal is not a pixel-perfect copy. It is a product that looks like it was
designed by one person with a point of view, rather than assembled from
defaults. Where this file is silent, follow naano's actual layout rather than
inventing something.

## Tokens

Define these once as CSS custom properties. Never hardcode a colour in a
component.

```
--bg:          #F7F8FA   page background, cool grey
--surface:     #FFFFFF   cards, tables, modals
--border:      #E8EAEE   hairlines, 1px, never heavier
--text:        #0F1729   primary text
--text-muted:  #6B7280   labels, secondary
--primary:     #2563EB   the blue. Buttons, active nav, links, focus.
--primary-soft:#EFF4FF   badge and pill backgrounds
--success:     #16A34A   active status only
--warn:        #D97706   blocked status only
```

One accent colour, and it is the blue. Status colours appear only inside status
pills, never as decoration.

## Type

One family: Inter, system fallback. No second display face.

```
page title    30px / 600 / -0.02em
section title 18px / 600
card title    15px / 600
body          14px / 400 / 1.5
metric value  20px / 600 / tabular-nums
label         12px / 500 / --text-muted
```

Metric numbers use `font-variant-numeric: tabular-nums`. Non-negotiable: columns
of figures that jitter between rows are the fastest way to look unfinished.

## Shape and depth

- Radius: 12px on cards and modals, 8px on buttons, inputs and pills. Two values
  only.
- Borders do the work, not shadows. `1px solid var(--border)`.
- Shadow appears in exactly two places: the profile modal, and dropdown menus.
  Nowhere else. No shadow on cards.
- Spacing scale: 4, 8, 12, 16, 24, 32, 48. Nothing between.

## Layout

- Fixed left icon rail, 72px, icons only, active item marked with
  `--primary-soft` background.
- Content max-width 1440px, 32px page padding.
- Creator grid: 3 columns at desktop, 2 at tablet, 1 at mobile.
- Tables for collaborations, cards for creators. Do not use cards for tabular
  data.

## Anti-slop rules

These are the tells. Avoid all of them.

- No gradient backgrounds, no gradient text, no gradient borders.
- No emoji in the interface.
- No ALL-CAPS tracked-out eyebrow labels above headings.
- No meta strings joined with middle dots.
- No arrow appended to button text.
- No fade-and-slide-up entrance animation on cards or sections. Motion only
  responds to a user action: modal open, dropdown, accordion.
- No hover-lift or scale transform on cards. Hover changes border colour only.
- No numbered markers (01 / 02 / 03) unless the content is genuinely a sequence.
- No decorative icons next to every label.
- One border-radius per element class, not a different one per component.

## Empty states

Every list gets a real empty state with a specific next action, not "No data".
Follow naano's own voice: "No collaborations yet, invite a creator from the
Marketplace." Plain sentence, names the action, links to it.

## Copy rules

- Sentence case everywhere. Never Title Case On Buttons.
- Buttons say what happens: "Invite creator", "Send brief". Never "Submit".
- The same action keeps the same word through the whole flow.
- No exclamation marks, no "Oops", no apologies in errors.

## Self-critique loop

After building any screen, screenshot it and look at it before moving on.
Ask three questions:

1. Could this screenshot belong to any SaaS product? If yes, it is too generic.
2. Is there more than one thing competing to be the focal point?
3. Would a column of numbers here shift if a value changed length?

Fix what fails, then continue. A picture is worth a thousand tokens.
