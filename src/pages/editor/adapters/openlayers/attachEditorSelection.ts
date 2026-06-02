import type OpenLayersMap from "ol/Map";
import type { Pixel } from "ol/pixel";
import { unByKey } from "ol/Observable";
import {
  EditabilityState,
  LockState,
  type EditorScene,
} from "@/pages/editor/types/editorTypes";
import { editorLayerIdProperty } from "./createOpenLayersLayer";

type EditorSelectionOptions = {
  // 핸들러는 한 번만 붙으므로 항상 최신 scene을 읽도록 getter로 받습니다.
  getScene: () => EditorScene | null;
  onSelect: (featureIds: string[]) => void;
  onHover: (featureId: string | null) => void;
};

// 편집 가능 레이어(편집 가능 + 잠금 해제)만 선택/호버 대상으로 봅니다.
function isLayerEditable(scene: EditorScene, layerId: string): boolean {
  const layer = scene.layers.find((candidate) => candidate.id === layerId);
  if (!layer) {
    return false;
  }

  return (
    layer.behavior.editability === EditabilityState.Editable &&
    layer.behavior.lock === LockState.Unlocked
  );
}

// 픽셀 위의 최상위 "선택 가능한" 피처 id를 찾습니다(없으면 null).
function pickSelectableFeatureId(
  map: OpenLayersMap,
  pixel: Pixel,
  scene: EditorScene,
): string | null {
  let picked: string | null = null;

  map.forEachFeatureAtPixel(pixel, (feature, layer) => {
    const layerId = layer?.get(editorLayerIdProperty);
    if (typeof layerId !== "string" || !isLayerEditable(scene, layerId)) {
      return false;
    }

    const id = feature.getId();
    if (typeof id === "string") {
      picked = id;
      return true; // 최상위 선택 가능 피처에서 멈춤
    }

    return false;
  });

  return picked;
}

// 지도 클릭으로 선택, 포인터 이동으로 호버를 store에 반영합니다. 정리 함수를 반환합니다.
export function attachEditorSelection(
  map: OpenLayersMap,
  options: EditorSelectionOptions,
) {
  const clickKey = map.on("singleclick", (event) => {
    const scene = options.getScene();
    const id = scene ? pickSelectableFeatureId(map, event.pixel, scene) : null;
    options.onSelect(id ? [id] : []);
  });

  const moveKey = map.on("pointermove", (event) => {
    if (event.dragging) {
      return;
    }

    const scene = options.getScene();
    const id = scene ? pickSelectableFeatureId(map, event.pixel, scene) : null;
    options.onHover(id);
  });

  return () => {
    unByKey(clickKey);
    unByKey(moveKey);
  };
}
