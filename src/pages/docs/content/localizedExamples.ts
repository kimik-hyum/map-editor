import type { Locale } from "@/shared/i18n/locale";
import { inputScene } from "./examples/input-scene.example";
import { inputScene as usInputScene } from "./examples/input-scene-us.example";
import inputExplanation from "./examples/input-scene.example.jsonc?raw";
import usInputExplanation from "./examples/input-scene-us.example.jsonc?raw";
import inputSource from "./examples/input-scene.example.ts?raw";
import usInputSource from "./examples/input-scene-us.example.ts?raw";

export function getDocsScene(locale: Locale) {
  return locale === "en" ? usInputScene : inputScene;
}

export function getDocsExample(locale: Locale) {
  return {
    scene: getDocsScene(locale),
    explanation: locale === "en" ? usInputExplanation : inputExplanation,
    source: locale === "en" ? usInputSource : inputSource,
  };
}
