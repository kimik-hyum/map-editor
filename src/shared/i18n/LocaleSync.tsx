import { useEffect } from "react";
import { useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import { getPageMetadata } from "./pageMetadata";

export function LocaleSync() {
  const { i18n } = useTranslation();
  const { pathname } = useLocation();
  useEffect(() => {
    const meta = getPageMetadata(pathname);
    document.documentElement.lang = meta.locale;
    document.title = meta.title;
    const fragment = document.createDocumentFragment();
    for (const { tag, attributes } of meta.elements) {
      const element = document.createElement(tag);
      element.setAttribute("data-page-metadata", "");
      for (const [name, value] of Object.entries(attributes)) {
        element.setAttribute(name, value);
      }
      fragment.append(element);
    }
    // Replace our own tags so navigation also works from a bare SPA fallback,
    // and repeated language switches never leave stale or duplicate metadata.
    for (const element of document.head.querySelectorAll("[data-page-metadata]")) {
      element.remove();
    }
    document.head.append(fragment);
    void i18n.changeLanguage(meta.locale);
  }, [pathname, i18n]);
  return null;
}
