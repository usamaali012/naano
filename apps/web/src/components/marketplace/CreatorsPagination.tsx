import { Button } from "../ui/Button";

interface CreatorsPaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

export function CreatorsPagination({
  page,
  pageSize,
  total,
  onPageChange,
}: CreatorsPaginationProps): JSX.Element {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between border-t border-border pt-s3 text-body text-text-muted">
      <span className="tabular-nums">
        Showing {first}–{last} of {total}
      </span>
      <div className="flex items-center gap-s3">
        <span className="tabular-nums">
          Page {page} of {totalPages}
        </span>
        <Button
          variant="secondary"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </Button>
        <Button
          variant="secondary"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
