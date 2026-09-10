import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from "react";

// Hairline-ruled table for tabular data (collaborations, invoices, attribution).
// Do not use cards for rows. Numeric cells should add `tabular-nums` so columns
// of figures don't jitter. See docs/DESIGN.md.

export function Table({ className = "", ...props }: HTMLAttributes<HTMLTableElement>): JSX.Element {
  return (
    <div className="w-full overflow-x-auto rounded-card border border-border bg-surface">
      <table className={`w-full border-collapse text-body ${className}`} {...props} />
    </div>
  );
}

export function THead({ className = "", ...props }: HTMLAttributes<HTMLTableSectionElement>): JSX.Element {
  return <thead className={`border-b border-border ${className}`} {...props} />;
}

export function TBody(props: HTMLAttributes<HTMLTableSectionElement>): JSX.Element {
  return <tbody {...props} />;
}

export function TR({ className = "", ...props }: HTMLAttributes<HTMLTableRowElement>): JSX.Element {
  return <tr className={`border-b border-border last:border-0 ${className}`} {...props} />;
}

export function TH({ className = "", ...props }: ThHTMLAttributes<HTMLTableCellElement>): JSX.Element {
  return (
    <th
      className={`px-s3 py-s3 text-left text-label font-medium text-text-muted ${className}`}
      {...props}
    />
  );
}

export function TD({ className = "", ...props }: TdHTMLAttributes<HTMLTableCellElement>): JSX.Element {
  return <td className={`px-s3 py-s3 align-middle text-text ${className}`} {...props} />;
}
