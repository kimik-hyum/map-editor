import { useEffect } from "react";
import { useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import { getPageMetadata } from "./pageMetadata";
import { getLocale, stripLocale } from "./locale";

export function LocaleSync() {
  const { i18n } = useTranslation();
  const { pathname } = useLocation();
  useEffect(() => {
    document.documentElement.lang = getLocale(pathname);
    const meta = getPageMetadata(pathname);
    document.title = meta.title;
    const description = document.querySelector<HTMLMetaElement>(
      'meta[name="description"]',
    );
    if (description) description.content = meta.description;
    const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (canonical) canonical.href = `https://maps-editor.pages.dev${pathname}`;
    for (const alternate of document.querySelectorAll<HTMLLinkElement>(
      'link[rel="alternate"][hreflang]',
    )) {
      alternate.href = `https://maps-editor.pages.dev/${alternate.hreflang}${stripLocale(pathname)}`;
    }
    void i18n.changeLanguage(getLocale(pathname));
  }, [pathname, i18n]);
  return null;
}
