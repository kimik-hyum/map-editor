import { Outlet } from "react-router";

export function EditorLayout() {
  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <div className="grid h-screen grid-cols-[300px_minmax(0,1fr)] overflow-hidden">
        <aside
          className="min-w-0 border-r border-[#d6e0e7] bg-white"
          aria-label="Editor side menu"
        />
        <Outlet />
      </div>
    </div>
  );
}
