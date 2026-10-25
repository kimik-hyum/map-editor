import { NavLink, type NavLinkProps, useLocation } from "react-router";
import { getLocale, localizePath } from "./locale";

export function LocalizedNavLink({ to, ...props }: NavLinkProps) {
  const { pathname } = useLocation();
  const locale = getLocale(pathname);
  const localized =
    typeof to === "string"
      ? localizePath(to, locale)
      : {
          ...to,
          pathname: to.pathname ? localizePath(to.pathname, locale) : undefined,
        };
  return <NavLink {...props} to={localized} />;
}
