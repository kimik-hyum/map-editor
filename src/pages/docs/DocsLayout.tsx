import { Outlet } from "react-router";
import { AppNavigation } from "../../shared/navigation/AppNavigation";

export function DocsLayout() {
  return (
    <div className="min-h-screen bg-surface">
      <AppNavigation />
      <Outlet />
    </div>
  );
}
