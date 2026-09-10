import { BrowserRouter, Routes, Route } from "react-router-dom";
import { PublicHome } from "./routes/PublicHome";
import { AppShell } from "./routes/AppShell";
import { CreatorsListPage } from "./routes/CreatorsListPage";

export function App(): JSX.Element {
  return (
    <BrowserRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route path="/" element={<PublicHome />} />
        <Route path="/app" element={<AppShell />}>
          <Route index element={<CreatorsListPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
