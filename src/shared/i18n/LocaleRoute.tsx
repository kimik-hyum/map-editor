import { Navigate, Outlet, useLocation, useParams } from "react-router";
import { LocaleContext } from "./localeContext";
import { LegacyRedirect } from "./LegacyRedirect";

export function LocaleRoute() {
  const { locale } = useParams();
  const { pathname } = useLocation();
  if (locale !== "ko" && locale !== "en") return <LegacyRedirect />;
  const known =
    /^\/(ko|en)\/(editing|integration|authentication|self-hosting(\/boundaries)?|about|demo|editor|screen|auth\/callback)?\/?$/.test(
      pathname,
    );
  if (!known && pathname !== `/${locale}`)
    return <Navigate to={`/${locale}/`} replace />;
  return (
    <LocaleContext.Provider value={locale}>
      <Outlet />
    </LocaleContext.Provider>
  );
}
