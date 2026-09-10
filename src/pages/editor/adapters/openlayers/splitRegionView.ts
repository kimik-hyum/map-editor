import { transformExtent } from "ol/proj";
import type { SnappedRegionView } from "./attachRegionBoundaryLayer";

// 화면상 같은 크기로 나누고 실제 화면 중심에서 가까운 조각을 먼저 조회합니다.
export function splitRegionView(
  view: SnappedRegionView,
  columns: number,
  rows: number,
): SnappedRegionView[] {
  const bounds = [view.minLng, view.minLat, view.maxLng, view.maxLat];
  const extent = transformExtent(bounds, "EPSG:4326", "EPSG:3857");
  const center = view.center ?? [
    (extent[0] + extent[2]) / 2,
    (extent[1] + extent[3]) / 2,
  ];
  const tiles = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < columns; x++) {
      const box = [
        extent[0] + ((extent[2] - extent[0]) * x) / columns,
        extent[1] + ((extent[3] - extent[1]) * y) / rows,
        extent[0] + ((extent[2] - extent[0]) * (x + 1)) / columns,
        extent[1] + ((extent[3] - extent[1]) * (y + 1)) / rows,
      ];
      const [minLng, minLat, maxLng, maxLat] = transformExtent(
        box,
        "EPSG:3857",
        "EPSG:4326",
      );
      tiles.push({
        distance:
          ((box[0] + box[2]) / 2 - center[0]) ** 2 +
          ((box[1] + box[3]) / 2 - center[1]) ** 2,
        view: {
          zoom: view.zoom,
          minLng: x === 0 ? view.minLng : minLng,
          minLat: y === 0 ? view.minLat : minLat,
          maxLng: x === columns - 1 ? view.maxLng : maxLng,
          maxLat: y === rows - 1 ? view.maxLat : maxLat,
        },
      });
    }
  }
  return tiles.sort((a, b) => a.distance - b.distance).map((tile) => tile.view);
}
