import { Outlet } from "react-router";
import { AppNavigation } from "../../shared/navigation/AppNavigation";

export function DocsLayout() {
  return (
    <div className="docs-layout">
      <AppNavigation />
      <Outlet />
    </div>
  );
}
