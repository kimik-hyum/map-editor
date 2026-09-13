import { inputScene } from "./examples/input-scene.example";

export const roundtripInputScene = inputScene;
export const roundtripOutputScene = structuredClone(roundtripInputScene);
const areaGeometry = roundtripOutputScene.features.find(
  (feature) => feature.id === "gyeongbokgung-area",
)?.geometry;
if (areaGeometry?.type === "Polygon") {
  areaGeometry.coordinates[0][2] = [126.984, 37.5865];
}

export const initMessageExample = JSON.stringify(
  {
    type: "MAP_EDITOR_INIT",
    sessionId: "edit-example-1",
    scene: roundtripInputScene,
  },
  null,
  2,
);
export const submitMessageExample = JSON.stringify(
  {
    type: "MAP_EDITOR_SUBMIT",
    sessionId: "edit-example-1",
    scene: roundtripOutputScene,
  },
  null,
  2,
);
