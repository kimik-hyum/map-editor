import { Outlet } from "react-router";
import { AppNavigation } from "../../shared/navigation/AppNavigation";

export function DemoLayout() {
  return (
    <div className="min-h-screen bg-[#fbf9f5]">
      <AppNavigation className="bg-[#fbf9f5]/[0.94]" />
      <div className="grid min-h-[calc(100vh-65px)] grid-cols-[220px_minmax(0,1fr)] max-[900px]:grid-cols-1">
        <aside
          className="flex flex-col gap-2 border-r border-[#d6e0e7] px-6 py-8 text-[#172033] max-[900px]:border-r-0 max-[900px]:border-b max-[900px]:py-5"
          aria-label="Demo layout"
        >
          <span className="text-xs font-black uppercase tracking-normal text-[#0f766e]">
            Demo
          </span>
          <strong>Host Window</strong>
        </aside>
        <Outlet />
      </div>
    </div>
  );
}
