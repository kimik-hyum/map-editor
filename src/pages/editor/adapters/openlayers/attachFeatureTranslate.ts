import Collection from "ol/Collection";
import type Feature from "ol/Feature";
import type { EventsKey } from "ol/events";
import type Geometry from "ol/geom/Geometry";
import Translate, { type TranslateEvent } from "ol/interaction/Translate";
import type OpenLayersMap from "ol/Map";
import { unByKey } from "ol/Observable";
import { canEditLayerVertices } from "@/pages/editor/types/editorTypes";
import type { EditorScene, GeoJsonGeometry } from "@/pages/editor/types/editorTypes";
import { olGeometryToEditorGeometry } from "./attachVertexModify";
import { forEachEditorContentLayer } from "./editorContentLayers";

type FeatureTranslateOptions = {
  // 항상 최신 scene을 읽어 이동 대상 레이어 상태를 확인합니다.
  getScene: () => EditorScene | null;
  // 몸통 드래그(이동)가 시작될 때 1회 호출(정점 핸들 숨김 등).
  onDragStart: () => void;
  // 좌표가 실제로 바뀐 피처만 호출(EPSG:4326 GeoJSON). 기존 히스토리 정책대로 undo 대상.
  onCommit: (featureId: string, geometry: GeoJsonGeometry) => void;
  // 이동 제스처 종료 시(오버레이 복구 등). 커밋 여부와 무관하게 호출.
  onDragEnd: () => void;
};

// 선택된 도형의 "몸통"을 드래그해 통째로 이동합니다(정점 근처는 Modify가 우선).
// - Modify보다 먼저 등록해 정점/외곽선 히트는 Modify가, 내부 몸통은 이동이 잡는다.
// - 드래그 중에는 OL 피처가 실시간으로 움직이고, 끝(translateend)에만 store에 커밋한다.
// 반환: { sync(선택 id 재바인딩), setActive(모드별 활성 토글), detach() }.
export function attachFeatureTranslate(
  map: OpenLayersMap,
  options: FeatureTranslateOptions,
) {
  const features = new Collection<Feature>();

  // 드래그 시작 시 원본 geometry를 복제해 둔다(취소 복구·실제 변경 판단용).
  const originals = new Map<string, Geometry>();

  const handleTranslateStart = (event: TranslateEvent) => {
    originals.clear();
    event.features.forEach((feature) => {
      const id = feature.getId();
      const geometry = feature.getGeometry();
      if (typeof id === "string" && geometry) {
        originals.set(id, geometry.clone());
      }
    });
    options.onDragStart();
  };

  const handleTranslateEnd = (event: TranslateEvent) => {
    event.features.forEach((feature) => {
      const id = feature.getId();
      const geometry = feature.getGeometry();
      if (typeof id !== "string" || !geometry) {
        return;
      }
      options.onCommit(id, olGeometryToEditorGeometry(geometry));
    });
    originals.clear();
    options.onDragEnd();
  };

  // 진행 중 제스처 취소 시 stale 내부 상태(pointer down/up 시퀀스)를 버리려면 재생성이 필요하다
  // (Map은 inactive interaction에 pointerup을 전달하지 않음 — Modify와 같은 이유).
  let startKey: EventsKey;
  let endKey: EventsKey;
  const buildTranslate = () => {
    const instance = new Translate({ features });
    startKey = instance.on("translatestart", handleTranslateStart);
    endKey = instance.on("translateend", handleTranslateEnd);
    return instance;
  };

  let translate = buildTranslate();
  map.addInteraction(translate);

  const recreateTranslate = () => {
    unByKey(startKey);
    unByKey(endKey);
    map.removeInteraction(translate);
    translate = buildTranslate();
    map.addInteraction(translate);
  };

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

  // 모드 전환 등으로 비활성화될 때: 진행 중 이동은 원본으로 되돌리고 커밋하지 않는다.
  const setActive = (next: boolean) => {
    if (!next && originals.size > 0) {
      features.forEach((feature) => {
        const id = feature.getId();
        const original = typeof id === "string" ? originals.get(id) : undefined;
        if (original) {
          feature.setGeometry(original.clone());
        }
      });
      recreateTranslate();
    }
    originals.clear();
    translate.setActive(next);
  };

  const detach = () => {
    unByKey(startKey);
    unByKey(endKey);
    map.removeInteraction(translate);
    features.clear();
  };

  return { sync, setActive, detach };
}
