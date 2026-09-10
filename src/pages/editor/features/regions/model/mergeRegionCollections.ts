import type { RegionFeatureCollection } from "../api/regionsApi";

// bbox에 걸친 폴리곤은 전체 geometry로 여러 번 오므로 행 ID로 중복 제거합니다.
export function mergeRegionCollections(
  collections: readonly RegionFeatureCollection[],
): RegionFeatureCollection | null {
  const first = collections[0];
  if (!first) return null;
  const features = new Map<string, RegionFeatureCollection["features"][number]>();
  for (const collection of collections) {
    if (
      collection.country !== first.country ||
      collection.kind !== first.kind ||
      collection.level !== first.level ||
      collection.cache?.version !== first.cache?.version ||
      collection.cache?.profile !== first.cache?.profile
    ) {
      throw new Error("경계 응답 종류가 일치하지 않습니다. 다시 조회해주세요.");
    }
    for (const feature of collection.features) {
      if (!features.has(String(feature.id))) features.set(String(feature.id), feature);
    }
  }
  return {
    ...first,
    truncated: collections.some((c) => c.truncated),
    features: [...features.values()],
  };
}
