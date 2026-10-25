import { useLocation, useNavigate } from "react-router";
import { getLocale, localizePath, type Locale } from "./locale";
import { useT } from "./useT";

export function LanguageSwitcher() {
  const location = useLocation();
  const navigate = useNavigate();
  const t = useT();
  return (
    <select
      aria-label={t("언어")}
      className="rounded-md border border-line bg-white px-2 py-1.5 text-sm text-ink"
      value={getLocale(location.pathname)}
      onChange={(event) =>
        navigate({
          pathname: localizePath(location.pathname, event.target.value as Locale),
          search: location.search,
          hash: location.hash,
        })
      }
    >
      <option value="ko" lang="ko">
        한국어
      </option>
      <option value="en" lang="en">
        English
      </option>
    </select>
  );
}
