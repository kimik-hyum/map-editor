import koExamples from "./locales/ko/examples.json";
import enExamples from "./locales/en/examples.json";
import { createInstance } from "i18next";
import koUi from "./locales/ko/ui.json";
import enUi from "./locales/en/ui.json";
import koDocs from "./locales/ko/docs.json";
import enDocs from "./locales/en/docs.json";
import { getLocale, type Locale } from "./locale";

export function createI18n(locale: Locale) {
  const instance = createInstance();
  // Bundled resources initialize synchronously, including during prerender/hydration.
  void instance.init({
    lng: locale,
    fallbackLng: "ko",
    supportedLngs: ["ko", "en"],
    resources: {
      ko: { ui: koUi, docs: koDocs, examples: koExamples },
      en: { ui: enUi, docs: enDocs, examples: enExamples },
    },
    ns: ["ui", "docs", "examples"],
    defaultNS: "ui",
    fallbackNS: "docs",
    keySeparator: false,
    nsSeparator: false,
    interpolation: { escapeValue: false },
    initAsync: false,
    react: { useSuspense: false },
  });
  return instance;
}

export const runtime = createI18n("ko");
// Non-React event handlers use the URL language at the time of the action.
// Stored names are translated when created, never when the scene is rendered.
export function t(key: string, values?: Record<string, unknown>): string {
  const locale =
    typeof window === "undefined" ? "ko" : getLocale(window.location.pathname);
  return runtime.t(key, { ...values, lng: locale });
}
