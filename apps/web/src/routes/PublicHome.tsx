import { Link } from "react-router-dom";
import { Button } from "../components/ui/Button";

export function PublicHome(): JSX.Element {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-4 text-center">
      <h1 className="text-3xl font-bold text-slate-900">naano</h1>
      <p className="max-w-md text-slate-600">
        Book vetted LinkedIn creators to publish sponsored posts, with every click
        tracked back to the creator.
      </p>
      <Link to="/app">
        <Button>Enter the app</Button>
      </Link>
    </div>
  );
}
