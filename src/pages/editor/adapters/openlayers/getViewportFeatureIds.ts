import type OpenLayersMap from "ol/Map";
import { forEachEditorContentLayer } from "./editorContentLayers";

// 현재 지도 화면(viewport) 안에 들어오는 콘텐츠 피처들의 id 집합을 구합니다.
// OL 벡터 소스의 R-tree(`getFeaturesInExtent`)로 ~O(log N)에 화면 범위와 bbox가 겹치는
// 피처만 추리므로, 수천 개가 로드돼 있어도 화면 밖은 비교 대상에서 빠집니다(broad-phase + viewport).
// 화면 크기를 아직 알 수 없으면(미렌더 등) null을 반환해 "viewport 제한 없음"으로 둡니다(과도한 컬링 방지).
export function getViewportFeatureIds(map: OpenLayersMap): Set<string> | null {
  const size = map.getSize();
  if (!size) {
    return null;
  }
  // getFeaturesInExtent은 bbox가 extent와 겹치는 피처를 반환(보수적 — 경계 걸친 것도 포함).
  const extent = map.getView().calculateExtent(size);
  const ids = new Set<string>();
  forEachEditorContentLayer(map, (layer) => {
    const source = layer.getSource();
    if (!source) {
      return;
    }
    for (const feature of source.getFeaturesInExtent(extent)) {
      const id = feature.getId();
      if (typeof id === "string") {
        ids.add(id);
      }
    }
  });
  return ids;
}
