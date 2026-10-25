import type OpenLayersMap from "ol/Map";
import { wrapAndSliceX } from "ol/extent";
import { get as getProjection, transformExtent } from "ol/proj";

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

export function readUsBoundaryViewports(
  map: OpenLayersMap,
): [number, number, number, number][] | null {
  const size = map.getSize();
  if (!size) return null;
  const extent = transformExtent(
    map.getView().calculateExtent(size),
    "EPSG:3857",
    "EPSG:4326",
  );
  extent[1] = Math.max(-85, extent[1]);
  extent[3] = Math.min(85, extent[3]);
  if (
    !extent.every(Number.isFinite) ||
    extent[0] >= extent[2] ||
    extent[1] >= extent[3]
  )
    return null;
  // 반복된 세계도 정규 경도로 조회하고, 날짜변경선을 걸치면 양쪽을 함께 요청합니다.
  const projection = getProjection("EPSG:4326");
  if (!projection) return null;
  return wrapAndSliceX(extent, projection).map(([west, south, east, north]) => [
    west,
    south,
    east,
    north,
  ]);
}
