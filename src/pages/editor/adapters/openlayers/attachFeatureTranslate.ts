import Collection from "ol/Collection";
import type Feature from "ol/Feature";
import { primaryAction } from "ol/events/condition";
import type { EventsKey } from "ol/events";
import type Geometry from "ol/geom/Geometry";
import Translate, { type TranslateEvent } from "ol/interaction/Translate";
import type OpenLayersMap from "ol/Map";
import { unByKey } from "ol/Observable";
import { canEditLayerVertices } from "@/pages/editor/types/editorTypes";
import type { EditorScene, GeoJsonGeometry } from "@/pages/editor/types/editorTypes";
import { sameCoordinates } from "./attachVertexModify";
import { forEachEditorContentLayer } from "./editorContentLayers";
import { olGeometryToEditorGeometry } from "./olGeometryToEditorGeometry";

type FeatureTranslateOptions = {
  // 항상 최신 scene을 읽어 이동 대상 레이어 상태를 확인합니다.
  getScene: () => EditorScene | null;
  // "실제로" 움직이기 시작했을 때 제스처당 1회 호출(정점 핸들 숨김 등).
  // 단순 클릭(눌렀다 뗌)에는 호출되지 않아 핸들이 깜빡이지 않는다.
  onDragStart: () => void;
  // 좌표가 실제로 바뀐 피처들을 제스처당 1회 묶어서 호출(EPSG:4326 GeoJSON).
  // 한 번의 드래그 = undo 1단계가 되도록 다중 이동도 배치로 커밋한다. 변경이 없으면 호출하지 않는다.
  onCommit: (
    updates: ReadonlyArray<{ featureId: string; geometry: GeoJsonGeometry }>,
  ) => void;
  // 이동 제스처 종료 시(오버레이 복구 등). 커밋 여부와 무관하게 호출.
  onDragEnd: () => void;
};

export type FeatureTranslateModifierState = {
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
};

// 선택 토글과 같은 Cmd(macOS)/Ctrl(기타)를 이동 보조키로 사용합니다.
// Shift는 범위 선택, Alt는 복제 같은 후속 제스처를 위해 조합에서 제외합니다.
export function isFeatureTranslateModifierActive({
  metaKey,
  ctrlKey,
  altKey,
  shiftKey,
}: FeatureTranslateModifierState): boolean {
  return (metaKey || ctrlKey) && !altKey && !shiftKey;
}

// Cmd/Ctrl을 누른 채 선택된 도형의 "몸통"을 드래그해 통째로 이동합니다(정점 근처는 Modify가 우선).
// - Modify보다 먼저 등록해 정점/외곽선 히트는 Modify가, 내부 몸통은 이동이 잡는다.
// - 보조키가 없으면 interaction이 비활성이라 같은 드래그를 기본 지도 이동이 처리한다.
// - 드래그 중에는 OL 피처가 실시간으로 움직이고, 끝(translateend)에만 store에 커밋한다.
// 반환: { sync(선택 id 재바인딩), setActive(모드별 활성 토글), detach() }.
export function attachFeatureTranslate(
  map: OpenLayersMap,
  options: FeatureTranslateOptions,
) {
  const features = new Collection<Feature>();

  // 드래그 시작 시 원본 geometry를 복제해 둔다(취소 복구·실제 변경 판단용).
  const originals = new Map<string, Geometry>();
  // 이번 제스처에서 실제 이동이 시작됐는지(클릭만으로는 켜지지 않음).
  let dragSignaled = false;
  // 모드 활성화와 보조키 상태를 분리합니다. Select 모드여도 보조키가 없으면 Translate는 꺼져 있습니다.
  let modeActive = false;
  let modifierActive = false;

  // Translate는 드래그가 없어도 누름/뗌만으로 start/end를 발생시키므로,
  // 시작 시점에는 스냅샷만 만들고 핸들 숨김 등은 실제 이동(translating)에서 알린다.
  const handleTranslateStart = (event: TranslateEvent) => {
    originals.clear();
    dragSignaled = false;
    event.features.forEach((feature) => {
      const id = feature.getId();
      const geometry = feature.getGeometry();
      if (typeof id === "string" && geometry) {
        originals.set(id, geometry.clone());
      }
    });
  };

  const handleTranslating = () => {
    if (!dragSignaled) {
      dragSignaled = true;
      options.onDragStart();
    }
  };

  const handleTranslateEnd = (event: TranslateEvent) => {
    const updates: { featureId: string; geometry: GeoJsonGeometry }[] = [];
    event.features.forEach((feature) => {
      const id = feature.getId();
      const geometry = feature.getGeometry();
      if (typeof id !== "string" || !geometry) {
        return;
      }
      // 실제로 움직인 피처만 커밋: 단순 클릭은 좌표 왕복 오차만으로
      // 히스토리·더티가 쌓이지 않게 원본과 동일하면 건너뛴다.
      const before = originals.get(id);
      if (before && sameCoordinates(before, geometry)) {
        return;
      }
      updates.push({ featureId: id, geometry: olGeometryToEditorGeometry(geometry) });
    });
    // 한 번의 드래그로 움직인 모든 피처를 한 커밋(=undo 1단계)으로 묶는다. 변경이 없으면 호출하지 않는다.
    if (updates.length > 0) {
      options.onCommit(updates);
    }
    originals.clear();
    if (dragSignaled) {
      options.onDragEnd();
    }
    dragSignaled = false;
  };

  // 진행 중 제스처 취소 시 stale 내부 상태(pointer down/up 시퀀스)를 버리려면 재생성이 필요하다
  // (Map은 inactive interaction에 pointerup을 전달하지 않음 — Modify와 같은 이유).
  let startKey: EventsKey;
  let movingKey: EventsKey;
  let endKey: EventsKey;
  const buildTranslate = () => {
    const instance = new Translate({ features, condition: primaryAction });
    startKey = instance.on("translatestart", handleTranslateStart);
    movingKey = instance.on("translating", handleTranslating);
    endKey = instance.on("translateend", handleTranslateEnd);
    return instance;
  };

  let translate = buildTranslate();
  translate.setActive(false);
  map.addInteraction(translate);

  const recreateTranslate = () => {
    unByKey(startKey);
    unByKey(movingKey);
    unByKey(endKey);
    map.removeInteraction(translate);
    translate = buildTranslate();
    translate.setActive(modeActive && modifierActive);
    map.addInteraction(translate);
  };

  const applyActiveState = () => {
    const next = modeActive && modifierActive;
    if (!next && originals.size > 0) {
      const shouldRestoreOverlays = dragSignaled && modeActive;
      features.forEach((feature) => {
        const id = feature.getId();
        const original = typeof id === "string" ? originals.get(id) : undefined;
        if (original) {
          feature.setGeometry(original.clone());
        }
      });
      recreateTranslate();
      if (shouldRestoreOverlays) {
        options.onDragEnd();
      }
    }
    originals.clear();
    dragSignaled = false;
    translate.setActive(next);
  };

  const handleModifierChange = (event: KeyboardEvent) => {
    const next = isFeatureTranslateModifierActive(event);
    if (modifierActive === next) {
      return;
    }
    modifierActive = next;
    applyActiveState();
  };

  const handleWindowBlur = () => {
    if (!modifierActive) {
      return;
    }
    modifierActive = false;
    applyActiveState();
  };

  window.addEventListener("keydown", handleModifierChange);
  window.addEventListener("keyup", handleModifierChange);
  window.addEventListener("blur", handleWindowBlur);

  // 선택된 도형의 OL 피처를 이동 컬렉션에 다시 바인딩(scene 재빌드 후에도 호출).
  // 잠긴/읽기 전용 도형은 이동 대상에서 제외한다(잠금 = 변경 금지).
  const sync = (selectedIds: ReadonlySet<string>) => {
    features.clear();
    const scene = options.getScene();
    if (!scene || selectedIds.size === 0) {
      return;
    }
    forEachEditorContentLayer(map, (layer, layerId) => {
      if (!canEditLayerVertices(scene, layerId)) {
        return;
      }
      const source = layer.getSource();
      if (!source) {
        return;
      }
      for (const id of selectedIds) {
        const feature = source.getFeatureById(id);
        if (feature) {
          features.push(feature);
        }
      }
    });
  };

  // 모드 전환으로 비활성화되거나 보조키를 놓을 때: 진행 중 이동은 원본으로 되돌리고 커밋하지 않는다.
  const setActive = (next: boolean) => {
    modeActive = next;
    applyActiveState();
  };

  const detach = () => {
    window.removeEventListener("keydown", handleModifierChange);
    window.removeEventListener("keyup", handleModifierChange);
    window.removeEventListener("blur", handleWindowBlur);
    unByKey(startKey);
    unByKey(movingKey);
    unByKey(endKey);
    map.removeInteraction(translate);
    features.clear();
  };

  return { sync, setActive, detach };
}
