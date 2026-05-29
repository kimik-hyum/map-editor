import { Outlet } from "react-router";
import { EditorModePanel } from "./features/modes";

export function EditorLayout() {
  return (
    <div className="min-h-screen bg-surface">
      <div className="grid h-screen grid-cols-[300px_minmax(0,1fr)] overflow-hidden">
        <aside
          className="min-w-0 border-r border-line bg-white"
          aria-label="Editor side menu"
        >
          <EditorModePanel />
        </aside>
        <Outlet />
      </div>
    </div>
  );
}
