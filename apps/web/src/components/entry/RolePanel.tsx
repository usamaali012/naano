// One whole clickable surface (a real <button>, so keyboard/focus behaviour is
// native) with its own CTA rendered inside it — a nested <button> isn't valid
// HTML, so the CTA is a styled span sharing ui/Button's classes.
interface RolePanelProps {
  title: string;
  subtitle?: string;
  bullets: string[];
  ctaLabel: string;
  pendingLabel: string;
  pending: boolean;
  disabled: boolean;
  onSelect: () => void;
}

export function RolePanel({
  title,
  subtitle,
  bullets,
  ctaLabel,
  pendingLabel,
  pending,
  disabled,
  onSelect,
}: RolePanelProps): JSX.Element {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className="flex flex-1 flex-col gap-s6 rounded-card border border-border bg-surface p-s8 text-left transition-colors hover:border-primary disabled:cursor-not-allowed disabled:opacity-60"
    >
      <div className="flex flex-col gap-s1">
        <h2 className="text-section-title text-text">{title}</h2>
        {subtitle && <p className="text-label text-text-muted">{subtitle}</p>}
      </div>

      <ul className="flex flex-1 flex-col gap-s2 list-disc pl-s4 marker:text-primary">
        {bullets.map((bullet) => (
          <li key={bullet} className="text-body text-text">
            {bullet}
          </li>
        ))}
      </ul>

      <span className="inline-flex w-fit items-center justify-center rounded-control bg-primary px-s4 py-s2 text-body font-medium text-white">
        {pending ? pendingLabel : ctaLabel}
      </span>
    </button>
  );
}
