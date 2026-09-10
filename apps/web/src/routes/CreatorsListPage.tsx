import { useEffect, useState } from "react";
import type { CreatorProfile } from "@naano/shared";
import { api } from "../lib/api";
import { useCreatorsStore } from "../lib/stores/creatorsStore";
import { CreatorGrid } from "../components/marketplace/CreatorGrid";
import { CreatorsPagination } from "../components/marketplace/CreatorsPagination";

export function CreatorsListPage(): JSX.Element {
  const page = useCreatorsStore((state) => state.page);
  const pageSize = useCreatorsStore((state) => state.pageSize);
  const setPage = useCreatorsStore((state) => state.setPage);

  const [creators, setCreators] = useState<CreatorProfile[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");

    api
      .listCreators({ page, pageSize })
      .then((result) => {
        if (cancelled) return;
        setCreators(result.items);
        setTotal(result.total);
        setStatus("ready");
      })
      .catch(() => {
        if (cancelled) return;
        setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [page, pageSize]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Creators</h1>
        <p className="text-sm text-slate-500">Vetted LinkedIn creators available to book.</p>
      </div>

      {status === "loading" && <p className="text-sm text-slate-500">Loading creators...</p>}
      {status === "error" && (
        <p className="text-sm text-red-600">Could not load creators. Is the API running?</p>
      )}
      {status === "ready" && total === 0 && (
        <p className="text-sm text-slate-500">No creators yet.</p>
      )}
      {status === "ready" && total > 0 && (
        <>
          <CreatorGrid creators={creators} />
          <CreatorsPagination
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}
