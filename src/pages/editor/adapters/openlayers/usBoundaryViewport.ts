import type OpenLayersMap from "ol/Map";
import { transformExtent } from "ol/proj";

export type UsBoundaryPreset = "new-york" | "san-francisco" | "continental-us";
const presets: Record<UsBoundaryPreset, [number, number, number, number]> = {
  "new-york": [-74.12, 40.6, -73.78, 40.9],
  "san-francisco": [-122.56, 37.65, -122.3, 37.85],
  "continental-us": [-125, 24, -66, 50],
};

export function focusUsBoundaryPreset(map: OpenLayersMap, preset: UsBoundaryPreset) {
  const view = map.getView();
  view.fit(transformExtent(presets[preset], "EPSG:4326", "EPSG:3857"), {
    // 왼쪽 레이어 패널을 피해 원본 채택 버튼이 있는 경계를 화면에 배치합니다.
    padding: [40, 40, 40, Math.min(400, (map.getSize()?.[0] ?? 1000) * 0.4)],
    maxZoom: 13,
  });
}

export function readUsBoundaryViewport(
  map: OpenLayersMap,
): [number, number, number, number] | null {
  const size = map.getSize();
  if (!size) return null;
  const extent = transformExtent(
    map.getView().calculateExtent(size),
    "EPSG:3857",
    "EPSG:4326",
  );
  const bbox: [number, number, number, number] = [
    Math.max(-180, extent[0]),
    Math.max(-85, extent[1]),
    Math.min(180, extent[2]),
    Math.min(85, extent[3]),
  ];
  return bbox.every(Number.isFinite) && bbox[0] < bbox[2] && bbox[1] < bbox[3]
    ? bbox
    : null;
}
