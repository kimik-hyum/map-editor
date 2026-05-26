import { Outlet } from "react-router";

export function EditorLayout() {
  return (
    <div className="editor-layout">
      <div className="editor-layout-frame">
        <aside className="editor-sidebar" aria-label="Editor side menu" />
        <Outlet />
      </div>
    </div>
  );
}
