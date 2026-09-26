// Pure presentation — no live data, no links. A genuine five-step sequence,
// so the numbered markers are the one place DESIGN.md's anti-slop rule allows
// them. Connected visually with a hairline between columns (row on desktop,
// stacked with a top line on narrow screens) rather than an arrow or a chevron.
interface Step {
  label: string;
  description: string;
}

const STEPS: Step[] = [
  { label: "Invite", description: "A brand books a creator against a campaign." },
  { label: "Accept", description: "The creator accepts or declines." },
  { label: "Draft", description: "The creator writes a post for review." },
  { label: "Publish", description: "The brand approves; the creator posts with a tracked link." },
  { label: "Paid", description: "Clicks land, then the brand marks it paid." },
];

export function BookingStepsStrip(): JSX.Element {
  return (
    <div className="flex flex-col gap-s6 rounded-card border border-border bg-surface p-s8">
      <h2 className="text-section-title text-text">How a booking moves</h2>
      <ol className="flex flex-col sm:flex-row">
        {STEPS.map((step, index) => (
          <li
            key={step.label}
            className={`flex flex-1 flex-col gap-s1 py-s4 first:pt-0 sm:py-0 sm:px-s6 sm:first:pl-0 ${
              index > 0 ? "border-t border-border sm:border-t-0 sm:border-l" : ""
            }`}
          >
            <span className="text-label text-text-muted">{index + 1}</span>
            <span className="text-card-title text-text">{step.label}</span>
            <span className="text-label text-text-muted">{step.description}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
