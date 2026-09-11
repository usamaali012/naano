import { useEffect, useState } from "react";

interface AvatarProps {
  src: string | null;
  name: string;
  /** Size + any extra classes. Applied to the circle. */
  className?: string;
  /** Font size for the initials. */
  initialsClassName?: string;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

// Photo avatar over an initials block. The initials always render; the image
// paints on top once it loads and is removed if it fails — so a slow or broken
// image degrades to initials rather than an empty circle.
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

  return (
    <span
      aria-hidden="true"
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-soft font-semibold text-primary ${className} ${initialsClassName}`}
    >
      {initials(name)}
      {src && !failed && (
        <img
          src={src}
          alt=""
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
    </span>
  );
}
