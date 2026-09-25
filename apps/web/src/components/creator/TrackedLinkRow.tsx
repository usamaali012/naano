import { useState } from "react";
import { Button } from "../ui/Button";
import { trackedLinkUrl } from "../../lib/trackedLink";

// The creator's own CTA link for a collaboration. Copying it is the whole
// point of the row — every click on it counts toward the brand's campaign.
// Shown on any collaboration that has minted a link, independent of that
// row's next action.
export function TrackedLinkRow({ slug }: { slug: string }): JSX.Element {
  const [copied, setCopied] = useState(false);
  const url = trackedLinkUrl(slug);

  async function copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access can be denied; the link is still visible to select.
    }
  }

  return (
    <div className="flex flex-col gap-s1 border-t border-border pt-s2">
      <p className="text-label text-text-muted">
        Your tracked link — share it, every click is counted here.
      </p>
      <div className="flex items-center gap-s2">
        <code className="flex-1 truncate rounded-control border border-border bg-bg px-s3 py-s2 text-label text-text">
          {url}
        </code>
        <Button size="sm" variant="secondary" onClick={() => void copy()}>
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
    </div>
  );
}
