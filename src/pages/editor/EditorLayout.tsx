import { Outlet } from "react-router";
import { AuthSessionButton } from "@/features/auth";

export function EditorLayout() {
  return (
    <div className="min-h-screen bg-surface">
      <AuthSessionButton />
      <Outlet />
    </div>
  );
}
