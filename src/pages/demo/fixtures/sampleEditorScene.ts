import type { EditorSceneInput } from "@/pages/editor/types/editorTypes";
import type { Locale } from "@/shared/i18n/locale";
import { usSampleSceneInput } from "./usSampleEditorScene";
import { seoulDemoBoundaries } from "./seoulDemoBoundaries";

// 실제 지역의 위치를 유지한 데모 경계입니다. 출처·가공 방식: docs/demo-boundaries.md
// 도형 순서·잠금·색상은 편집/참고 영역의 역할을 보여줍니다.
export const sampleSceneInput: EditorSceneInput = {
  version: 2,
  id: "sample-seoul-editor-scene",
  name: "서울 행정동 샘플 편집 씬",
  viewport: { center: [127.002, 37.571], zoom: 13.4 },
  features: [
    {
      name: "마스크 예시",
      locked: true,
      themeToken: "mask",
      geometry: seoulDemoBoundaries.mask.geometry,
      properties: seoulDemoBoundaries.mask.properties,
    },
    {
      name: "스냅 예시",
      locked: true,
      themeToken: "snapTarget",
      geometry: seoulDemoBoundaries.snap.geometry,
      properties: seoulDemoBoundaries.snap.properties,
    },
    {
      name: "오류 예시",
      locked: true,
      themeToken: "invalid",
      geometry: seoulDemoBoundaries.invalid.geometry,
      properties: seoulDemoBoundaries.invalid.properties,
    },
    {
      name: "참고 1",
      locked: true,
      themeToken: "reference",
      geometry: seoulDemoBoundaries.reference.geometry,
      properties: seoulDemoBoundaries.reference.properties,
    },
    {
      name: "가회동",
      geometry: seoulDemoBoundaries.unnamed.geometry,
      properties: seoulDemoBoundaries.unnamed.properties,
    },
    {
      name: "권역 A",
      themeToken: "editable",
      geometry: seoulDemoBoundaries.a.geometry,
      properties: seoulDemoBoundaries.a.properties,
    },
    {
      name: "권역 B",
      themeToken: "active",
      geometry: seoulDemoBoundaries.b.geometry,
      properties: seoulDemoBoundaries.b.properties,
    },
    {
      name: "권역 C",
      themeToken: "selected",
      geometry: seoulDemoBoundaries.c.geometry,
      properties: seoulDemoBoundaries.c.properties,
    },
  ],
};

export function getSampleEditorScene(locale: Locale): EditorSceneInput {
  return locale === "en" ? usSampleSceneInput : sampleSceneInput;
}
