import type { RegionViewQuery } from "../api/regionsApi";

export type RegionViewPart = {
  view: Omit<RegionViewQuery, "kind" | "country">;
  depth: number;
};

// 제한 응답이 반복되어도 요청 수가 무한히 늘지 않게 합니다.
const MAX_DEPTH = 3;
const MAX_PARTS = 64;

export function refineTruncatedRegionViews(
  parts: readonly RegionViewPart[],
  truncatedIndexes: readonly number[],
): readonly RegionViewPart[] {
  const truncated = new Set(truncatedIndexes);
  let count = parts.length;
  const next = parts.flatMap((part, index) => {
    const { view, depth } = part;
    const midLng = (view.minLng + view.maxLng) / 2;
    const midLat = (view.minLat + view.maxLat) / 2;
    if (
      !truncated.has(index) ||
      depth >= MAX_DEPTH ||
      count + 3 > MAX_PARTS ||
      midLng <= view.minLng ||
      midLng >= view.maxLng ||
      midLat <= view.minLat ||
      midLat >= view.maxLat
    )
      return [part];
    count += 3;
    return [
      [view.minLng, view.minLat, midLng, midLat],
      [midLng, view.minLat, view.maxLng, midLat],
      [view.minLng, midLat, midLng, view.maxLat],
      [midLng, midLat, view.maxLng, view.maxLat],
    ].map(([minLng, minLat, maxLng, maxLat]) => ({
      depth: depth + 1,
      view: { zoom: view.zoom, minLng, minLat, maxLng, maxLat },
    }));
  });
  return count === parts.length ? parts : next;
}
