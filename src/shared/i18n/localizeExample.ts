import type { TFunction } from "i18next";
import sourceKeys from "./locales/ko/examples.json";

// Only explicitly marked, shipped documentation examples use this replacement.
// Scene JSON and user-entered names never pass through it. Longer comments must
// precede their prefixes (for example '// 남서쪽 꼭짓점' before '// 남서').
const keys = Object.keys(sourceKeys).sort((a, b) => b.length - a.length);
export function localizeExample(code: string, t: TFunction, locale: string) {
  let localized = t(code);
  if (locale !== "en") return localized;
  for (const key of keys) {
    if (key.startsWith("//"))
      localized = localized.split(key).join(t(key, { ns: "examples" }));
    else
      localized = localized
        .split(JSON.stringify(key))
        .join(JSON.stringify(t(key, { ns: "examples" })));
  }
  return localized
    .split("https://maps-editor.pages.dev/editor/")
    .join("https://maps-editor.pages.dev/en/editor/")
    .split('"/editor/"')
    .join('"/en/editor/"');
}
