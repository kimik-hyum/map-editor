import type { Locale } from "@/shared/i18n/locale";
import minimalSource from "./examples/minimal-service.example.ts?raw";
import usMinimalSource from "./examples/minimal-service-us.example.ts?raw";
import editorContractSource from "./examples/editor-contract.example.ts?raw";
import inputSource from "./examples/input-scene.example.ts?raw";
import { inputScene } from "./examples/input-scene.example";
import mapEditorHostSource from "./examples/map-editor-host.example.ts?raw";
import parentPageSource from "./examples/service-page.example.ts?raw";

export const sceneInputExample = JSON.stringify(inputScene, null, 2);
export const inputSceneSource = inputSource;
export const messageSchemaExample = editorContractSource;
export const parentHostExample = mapEditorHostSource;
export const resultUsageExample = parentPageSource;

export { default as palaceStarterExample } from "./examples/gyeongbokgung.example.ts?raw";
export { default as minimalServiceExample } from "./examples/minimal-service.example.ts?raw";

export function getMinimalServiceExample(locale: Locale) {
  return locale === "en" ? usMinimalSource : minimalSource;
}
