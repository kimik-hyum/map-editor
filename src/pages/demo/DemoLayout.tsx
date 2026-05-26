import { Outlet } from "react-router";
import { AppNavigation } from "../../shared/navigation/AppNavigation";

export function DemoLayout() {
  return (
    <div className="demo-layout">
      <AppNavigation />
      <div className="demo-layout-frame">
        <aside className="layout-rail" aria-label="Demo layout">
          <span className="rail-kicker">Demo</span>
          <strong>Host Window</strong>
        </aside>
        <Outlet />
      </div>
    </div>
  );
}
