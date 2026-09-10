import { Outlet, Link } from "react-router-dom";
import { useUiStore } from "../lib/stores/uiStore";
import { Button } from "../components/ui/Button";

export function AppShell(): JSX.Element {
  const sidebarCollapsed = useUiStore((state) => state.sidebarCollapsed);
  const toggleSidebar = useUiStore((state) => state.toggleSidebar);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={toggleSidebar}>
            {sidebarCollapsed ? "Expand" : "Collapse"}
          </Button>
          <Link to="/" className="text-lg font-semibold text-slate-900">
            naano
          </Link>
        </div>
      </header>
      <div className="flex">
        {!sidebarCollapsed && (
          <aside className="w-48 shrink-0 border-r border-slate-200 bg-white p-4 text-sm text-slate-500">
            Creators
          </aside>
        )}
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
