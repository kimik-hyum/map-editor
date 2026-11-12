import type { EditorSceneInput } from "@/pages/editor/types/editorTypes";
import { newYorkDemoBoundaries } from "./newYorkDemoBoundaries";

// 실제 지역의 위치를 유지한 데모 경계입니다. 출처·가공 방식: docs/demo-boundaries.md
// 도형 순서·잠금·색상은 편집/참고 영역의 역할을 보여줍니다.
export const usSampleSceneInput: EditorSceneInput = {
  version: 2,
  id: "sample-new-york-editor-scene",
  name: "New York neighborhood sample editing scene",
  viewport: { center: [-73.962, 40.735], zoom: 12.8 },
  features: [
    {
      name: "Mask example",
      locked: true,
      themeToken: "mask",
      geometry: newYorkDemoBoundaries.mask.geometry,
      properties: newYorkDemoBoundaries.mask.properties,
    },
    {
      name: "Snap example",
      locked: true,
      themeToken: "snapTarget",
      geometry: newYorkDemoBoundaries.snap.geometry,
      properties: newYorkDemoBoundaries.snap.properties,
    },
    {
      name: "Invalid example",
      locked: true,
      themeToken: "invalid",
      geometry: newYorkDemoBoundaries.invalid.geometry,
      properties: newYorkDemoBoundaries.invalid.properties,
    },
    {
      name: "Reference 1",
      locked: true,
      themeToken: "reference",
      geometry: newYorkDemoBoundaries.reference.geometry,
      properties: newYorkDemoBoundaries.reference.properties,
    },
    {
      name: "Long Island City",
      geometry: newYorkDemoBoundaries.unnamed.geometry,
      properties: newYorkDemoBoundaries.unnamed.properties,
    },
    {
      name: "Area A",
      themeToken: "editable",
      geometry: newYorkDemoBoundaries.a.geometry,
      properties: newYorkDemoBoundaries.a.properties,
    },
    {
      name: "Area B",
      themeToken: "active",
      geometry: newYorkDemoBoundaries.b.geometry,
      properties: newYorkDemoBoundaries.b.properties,
    },
    {
      name: "Area C",
      themeToken: "selected",
      geometry: newYorkDemoBoundaries.c.geometry,
      properties: newYorkDemoBoundaries.c.properties,
    },
  ],
};
