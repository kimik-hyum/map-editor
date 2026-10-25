import { Link, type LinkProps, useLocation } from "react-router";
import { getLocale, localizePath } from "./locale";

export function LocalizedLink({ to, ...props }: LinkProps) {
  const { pathname } = useLocation();
  const locale = getLocale(pathname);
  const localized =
    typeof to === "string"
      ? localizePath(to, locale)
      : {
          ...to,
          pathname: to.pathname ? localizePath(to.pathname, locale) : undefined,
        };
  return <Link {...props} to={localized} />;
}
