import type OpenLayersMap from "ol/Map";
import type { Pixel } from "ol/pixel";
import { unByKey } from "ol/Observable";
import { canSelectLayer, type EditorScene } from "@/pages/editor/types/editorTypes";
import { getEditorLayerId } from "./editorContentLayers";

type EditorSelectionOptions = {
  // 핸들러는 한 번만 붙으므로 항상 최신 scene을 읽도록 getter로 받습니다.
  getScene: () => EditorScene | null;
  // 픽한 피처 id(없으면 null)와 보조키 상태(DOM 사실)를 알립니다.
  // "어떤 키가 토글인가"·교체/해제 정책은 hook이 결정합니다(어댑터는 features/* 정책을 모름).
  onSelect: (
    featureId: string | null,
    modifiers: { metaKey: boolean; ctrlKey: boolean },
  ) => void;
  onHover: (featureId: string | null) => void;
};

// 픽셀 위의 최상위 "선택 가능한" 피처 id를 찾습니다(없으면 null).
function pickSelectableFeatureId(
  map: OpenLayersMap,
  pixel: Pixel,
  scene: EditorScene,
): string | null {
  let picked: string | null = null;

  map.forEachFeatureAtPixel(
    pixel,
    (feature, layer) => {
      const layerId = layer ? getEditorLayerId(layer) : undefined;
      if (layerId === undefined || !canSelectLayer(scene, layerId)) {
        return false;
      }

      const id = feature.getId();
      if (typeof id === "string") {
        picked = id;
        return true; // 최상위 선택 가능 피처에서 멈춤
      }

      return false;
    },
    // 콘텐츠 레이어만 hit-test(정점/상세 오버레이·베이스맵 제외).
    { layerFilter: (layer) => getEditorLayerId(layer) !== undefined },
  );

  return picked;
}

// 지도 클릭으로 선택, 포인터 이동으로 호버를 store에 반영합니다. 정리 함수를 반환합니다.
export function attachEditorSelection(
  map: OpenLayersMap,
  options: EditorSelectionOptions,
) {
  // 비활성 모드(Select 외)에서는 선택/호버를 멈춘다. 기존 선택 상태 자체는 유지된다.
  let active = true;

  const clickKey = map.on("singleclick", (event) => {
    if (!active) {
      return;
    }
    const scene = options.getScene();
    const id = scene ? pickSelectableFeatureId(map, event.pixel, scene) : null;
    // DOM 보조키 상태만 전달한다(어떤 키가 토글인지는 hook이 정책 함수로 판단).
    const original = event.originalEvent as MouseEvent | undefined;
    options.onSelect(id, {
      metaKey: Boolean(original?.metaKey),
      ctrlKey: Boolean(original?.ctrlKey),
    });
  });

  const moveKey = map.on("pointermove", (event) => {
    if (!active || event.dragging) {
      return;
    }

    const scene = options.getScene();
    const id = scene ? pickSelectableFeatureId(map, event.pixel, scene) : null;
    options.onHover(id);
  });

  const setActive = (next: boolean) => {
    active = next;
  };

  const detach = () => {
    unByKey(clickKey);
    unByKey(moveKey);
  };

  return { setActive, detach };
}
