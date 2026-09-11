import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { EntryPage } from "./routes/EntryPage";
import { AppShell } from "./routes/AppShell";
import { CreatorsListPage } from "./routes/CreatorsListPage";
import { CreatorHomePage } from "./routes/CreatorHomePage";
import { CollaborationsPage } from "./routes/CollaborationsPage";
import { ResultsPage } from "./routes/ResultsPage";
import { useAuthStore } from "./lib/stores/authStore";

// Signed out -> back to the entry page. Signed in -> the surface for your side:
// brands get the marketplace, creators get their own profile view.
function AppIndex(): JSX.Element {
  const token = useAuthStore((state) => state.token);
  const role = useAuthStore((state) => state.me?.role);
  if (!token) return <Navigate to="/" replace />;
  return role === "CREATOR" ? <CreatorHomePage /> : <CreatorsListPage />;
}

// Collaborations is brand-only. A creator who reaches the URL directly (the
// rail never shows it to them) lands back on their own screen, not an error.
function RequireBrand({ children }: { children: JSX.Element }): JSX.Element {
  const token = useAuthStore((state) => state.token);
  const role = useAuthStore((state) => state.me?.role);
  if (!token) return <Navigate to="/" replace />;
  if (role !== "COMPANY") return <Navigate to="/app" replace />;
  return children;
}

export function App(): JSX.Element {
  return (
    <BrowserRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route path="/" element={<EntryPage />} />
        <Route path="/app" element={<AppShell />}>
          <Route index element={<AppIndex />} />
          <Route
            path="collaborations"
            element={
              <RequireBrand>
                <CollaborationsPage />
              </RequireBrand>
            }
          />
          <Route
            path="results"
            element={
              <RequireBrand>
                <ResultsPage />
              </RequireBrand>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
