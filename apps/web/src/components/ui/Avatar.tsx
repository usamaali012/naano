import { useEffect, useState } from "react";

interface AvatarProps {
  src: string | null;
  name: string;
  /** Size + any extra classes. Applied to both the image and the fallback. */
  className?: string;
  /** Font size for the initials fallback. */
  initialsClassName?: string;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

// A photo avatar with an initials block as the fallback for a missing or failed
// image — not the default. Circle, cover-fit.
export function Avatar({
  src,
  name,
  className = "",
  initialsClassName = "text-card-title",
}: AvatarProps): JSX.Element {
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setFailed(false);
  }, [src]);

  const shape = `shrink-0 overflow-hidden rounded-full ${className}`;

  if (!src || failed) {
    return (
      <span
        aria-hidden="true"
        className={`inline-flex items-center justify-center bg-primary-soft font-semibold text-primary ${shape} ${initialsClassName}`}
      >
        {initials(name)}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
      className={`object-cover ${shape}`}
    />
  );
}
