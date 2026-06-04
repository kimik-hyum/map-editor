import type BaseLayer from "ol/layer/Base";
import VectorLayer from "ol/layer/Vector";
import type OpenLayersMap from "ol/Map";
import { editorLayerIdProperty } from "./createOpenLayersLayer";

// 에디터 콘텐츠 레이어를 식별·순회하는 공통 헬퍼입니다.
// 콘텐츠 레이어 = mapEditorLayerId가 붙은 레이어(베이스맵·정점/상세 오버레이는 제외).
// 여러 어댑터(선택/정점편집/affordance/스타일 무효화/씬 동기화)가 같은 순회 패턴을
// 중복으로 갖고 있어 한곳으로 모읍니다.

// 레이어에 부여된 에디터 레이어 id(없으면 undefined).
export function getEditorLayerId(layer: BaseLayer): string | undefined {
  const id = layer.get(editorLayerIdProperty);
  return typeof id === "string" ? id : undefined;
}

// 피처/소스를 다루는 VectorLayer이면서 에디터 콘텐츠 레이어인지.
export function isEditorContentLayer(layer: BaseLayer): layer is VectorLayer {
  return layer instanceof VectorLayer && getEditorLayerId(layer) !== undefined;
}

// 지도의 모든 에디터 콘텐츠 VectorLayer를 레이어 순서대로 순회합니다(레이어 id 동반).
export function forEachEditorContentLayer(
  map: OpenLayersMap,
  callback: (layer: VectorLayer, layerId: string) => void,
): void {
  for (const layer of map.getLayers().getArray()) {
    if (!isEditorContentLayer(layer)) {
      continue;
    }
    const layerId = getEditorLayerId(layer);
    if (layerId === undefined) {
      continue;
    }
    callback(layer, layerId);
  }
}
