import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { EntryPage } from "./routes/EntryPage";
import { AppShell } from "./routes/AppShell";
import { CreatorsListPage } from "./routes/CreatorsListPage";
import { CreatorHomePage } from "./routes/CreatorHomePage";
import { useAuthStore } from "./lib/stores/authStore";

// Signed out -> back to the entry page. Signed in -> the surface for your side:
// brands get the marketplace, creators get their own profile view.
function AppIndex(): JSX.Element {
  const token = useAuthStore((state) => state.token);
  const role = useAuthStore((state) => state.me?.role);
  if (!token) return <Navigate to="/" replace />;
  return role === "CREATOR" ? <CreatorHomePage /> : <CreatorsListPage />;
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
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
