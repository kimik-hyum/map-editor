import type OpenLayersMap from "ol/Map";
import { forEachEditorContentLayer } from "./editorContentLayers";

// 주어진 피처 id들의 스타일을 다시 평가하도록, 그 피처가 속한 콘텐츠 레이어만 무효화합니다.
// map.render()는 캔버스 벡터 레이어가 캐시한 배치를 재사용하므로 스타일 함수를 다시 부르지 않습니다.
// 대신 layer.changed()로 레이어 revision을 올려 배치를 재빌드(=스타일 재평가)하게 합니다.
// 베이스맵·정점 오버레이처럼 mapEditorLayerId가 없는 레이어는 자동으로 제외됩니다.
export function invalidateFeatureStyles(
  map: OpenLayersMap,
  featureIds: readonly string[],
): void {
  if (featureIds.length === 0) {
    return;
  }

  forEachEditorContentLayer(map, (layer) => {
    const source = layer.getSource();
    if (!source) {
      return;
    }

    const affected = featureIds.some((id) => source.getFeatureById(id) !== null);
    if (affected) {
      layer.changed();
    }
  });
}
