import type { Locale } from "@/shared/i18n/locale";
import { getDocsScene } from "./localizedExamples";

export function getRoundtripExamples(locale: Locale) {
  const roundtripInputScene = getDocsScene(locale);
  const roundtripOutputScene = structuredClone(roundtripInputScene);
  const areaGeometry = roundtripOutputScene.features[0].geometry;
  if (areaGeometry.type === "Polygon") {
    const [longitude, latitude] = areaGeometry.coordinates[0][2];
    areaGeometry.coordinates[0][2] = [
      Number((longitude + 0.002).toFixed(6)),
      Number((latitude + 0.001).toFixed(6)),
    ];
  }
  return {
    roundtripInputScene,
    roundtripOutputScene,
    initMessageExample: JSON.stringify(
      {
        type: "MAP_EDITOR_INIT",
        sessionId: "edit-example-1",
        scene: roundtripInputScene,
      },
      null,
      2,
    ),
    submitMessageExample: JSON.stringify(
      {
        type: "MAP_EDITOR_SUBMIT",
        sessionId: "edit-example-1",
        scene: roundtripOutputScene,
      },
      null,
      2,
    ),
  };
}

export const {
  roundtripInputScene,
  roundtripOutputScene,
  initMessageExample,
  submitMessageExample,
} = getRoundtripExamples("ko");
