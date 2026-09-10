import { LogOut } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

export function AuthSessionButton() {
  const { signOut, user } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <button
      aria-label="Google 로그아웃"
      className="fixed bottom-3 left-3 z-50 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-white text-ink-soft shadow-md transition-colors hover:bg-slate-50 hover:text-ink"
      onClick={() => void signOut()}
      title={`${user?.email ?? "Google 계정"} 로그아웃`}
      type="button"
    >
      <LogOut aria-hidden className="h-4 w-4" />
    </button>
  );
}
