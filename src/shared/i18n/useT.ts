import { useContext } from "react";
import { I18nContext, useTranslation } from "react-i18next";
import { runtime } from "./i18n";
import { LocaleContext } from "./localeContext";

export function useT() {
  const context = useContext(I18nContext);
  const locale = useContext(LocaleContext);
  return useTranslation(["ui", "docs"], {
    i18n: context?.i18n ?? runtime,
    ...(locale ? { lng: locale } : {}),
  }).t;
}
