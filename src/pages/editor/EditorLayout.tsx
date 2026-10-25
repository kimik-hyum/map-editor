import { LanguageSwitcher } from "@/shared/i18n/LanguageSwitcher";
import { Outlet } from "react-router";
import { AuthSessionButton } from "@/features/auth";

export function EditorLayout() {
  return (
    <div className="min-h-screen bg-surface">
      <AuthSessionButton />
      <div className="fixed right-12 top-1.5 z-50">
        <LanguageSwitcher />
      </div>
      <Outlet />
    </div>
  );
}
