import type { RegionTile, RegionTileManifest } from "../api/regionsApi";
import { REGION_TILE_CACHE_MAX_ZOOM } from "./regionQueryPolicy";

type TileView = {
  zoom: number;
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
  center?: readonly number[];
};
export function usesRegionTileCache(zoom: number): boolean {
  return Number.isInteger(zoom) && zoom >= 0 && zoom <= REGION_TILE_CACHE_MAX_ZOOM;
}
export function selectFixedRegionTiles(
  view: TileView,
  manifest: RegionTileManifest,
): RegionTile[] {
  if (!usesRegionTileCache(view.zoom)) return [];
  const z = Math.max(6, view.zoom - 1),
    n = 2 ** z;
  const x = (lon: number) => ((lon + 180) / 360) * n;
  const y = (lat: number) =>
    ((1 -
      Math.asinh(
        Math.tan((Math.max(-85.05112878, Math.min(85.05112878, lat)) * Math.PI) / 180),
      ) /
        Math.PI) /
      2) *
    n;
  const minX = Math.floor(x(view.minLng) + 1e-10),
    maxX = Math.ceil(x(view.maxLng) - 1e-10) - 1;
  const minY = Math.floor(y(view.maxLat) + 1e-10),
    maxY = Math.ceil(y(view.minLat) - 1e-10) - 1;
  // World Mercator half-width. Supplied map center is already in EPSG:3857.
  const half = 20037508.342789244;
  const centerX = view.center
    ? ((view.center[0] + half) / (2 * half)) * n
    : (minX + maxX + 1) / 2;
  const centerY = view.center
    ? ((half - view.center[1]) / (2 * half)) * n
    : (minY + maxY + 1) / 2;
  const distance = (tile: RegionTile) =>
    (tile.x + 0.5 - centerX) ** 2 + (tile.y + 0.5 - centerY) ** 2;
  const unique = new Map<string, RegionTile>();
  for (const tile of manifest.tiles)
    if (
      tile.z === z &&
      tile.x >= minX &&
      tile.x <= maxX &&
      tile.y >= minY &&
      tile.y <= maxY
    )
      unique.set(`${tile.z}/${tile.x}/${tile.y}`, tile);
  return [...unique.values()].sort(
    (a, b) => distance(a) - distance(b) || a.y - b.y || a.x - b.x,
  );
}
