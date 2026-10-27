import { Navigate, useLocation } from "react-router";

// The neutral callback URL stays registered with Supabase. Preserve its PKCE query
// and hash while displaying the result in the language of the editor that opened it.
export function AuthCallbackRoute() {
  const { search, hash } = useLocation();
  const locale =
    typeof window !== "undefined" &&
    window.sessionStorage.getItem("termia-auth-locale") === "en"
      ? "en"
      : "ko";
  return <Navigate to={`/${locale}/auth/callback${search}${hash}`} replace />;
}
