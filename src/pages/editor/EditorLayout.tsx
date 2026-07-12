import { Outlet } from "react-router";

export function EditorLayout() {
  return (
    <div className="min-h-screen bg-surface">
      <Outlet />
    </div>
  );
}
