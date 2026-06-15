import { useMemo } from "react";
import { useEditorStore } from "@/pages/editor/state/editorStore";
import {
  EditorMode,
  isPolygonalGeometry,
  type EditorScene,
  type GeoJsonGeometry,
  type PolygonalGeometry,
} from "@/pages/editor/types/editorTypes";
import {
  buildGeometryOpCandidates,
  type GeometryOpCandidate,
} from "../model/geometryOpsModel";
import { deriveGeometryOpTargets } from "../model/geometryOpsModel";
import { subtractGeometry, unionGeometries } from "../model/booleanOps";

// scene에서 피처의 폴리곤 geometry를 찾습니다(폴리곤이 아니면 null). 연산 입력 조회용.
function getPolygonalGeometry(
  scene: EditorScene | null,
  featureId: string,
): PolygonalGeometry | null {
  if (!scene) {
    return null;
  }
  for (const layer of scene.layers) {
    for (const feature of layer.features) {
      if (feature.id === featureId) {
        const geometry = feature.feature.geometry as GeoJsonGeometry;
        return isPolygonalGeometry(geometry) ? geometry : null;
      }
    }
  }
  return null;
}

// 병합/제거 패널의 상태와 동작을 모읍니다(지도 hook과 독립 — store만 본다).
// 선택된 단일 편집 폴리곤(target)에 대해 합칠/뺄 후보를 도출하고, 패널에서 그 동작을 적용합니다.
// 지도에는 칩을 얹지 않으므로 이름 라벨은 그대로 유지됩니다.
export function useGeometryOps() {
  const scene = useEditorStore((state) => state.scene);
  const selectedFeatureIds = useEditorStore((state) => state.selectedFeatureIds);
  const activeMode = useEditorStore((state) => state.activeMode);

  const { targetId, candidates } = useMemo<{
    targetId: string | null;
    candidates: GeometryOpCandidate[];
  }>(() => {
    // 병합/제거는 선택 모드에서, 단일 편집 폴리곤이 선택됐을 때만.
    if (activeMode !== EditorMode.Select) {
      return { targetId: null, candidates: [] };
    }
    const targets = deriveGeometryOpTargets(scene, new Set(selectedFeatureIds));
    return {
      targetId: targets.targetId,
      candidates: buildGeometryOpCandidates(scene, targets),
    };
  }, [scene, selectedFeatureIds, activeMode]);

  // 병합(union): target에 후보를 합치고 후보(편집 peer) 피처를 삭제(흡수). 클릭 시점에 최신 scene을 읽는다.
  const merge = (otherId: string) => {
    if (!targetId) {
      return;
    }
    const currentScene = useEditorStore.getState().scene as EditorScene | null;
    const target = getPolygonalGeometry(currentScene, targetId);
    const other = getPolygonalGeometry(currentScene, otherId);
    if (!target || !other) {
      return;
    }
    const result = unionGeometries(target, other);
    if (result) {
      useEditorStore.getState().mergeFeatures(targetId, otherId, result);
    }
  };

  // 제거(difference): target에서 후보와 겹친 부분을 뺀다. undefined(연산 실패)면 no-op, null(빈 결과)이면 store가 target 삭제.
  const subtract = (cutterId: string) => {
    if (!targetId) {
      return;
    }
    const currentScene = useEditorStore.getState().scene as EditorScene | null;
    const target = getPolygonalGeometry(currentScene, targetId);
    const cutter = getPolygonalGeometry(currentScene, cutterId);
    if (!target || !cutter) {
      return;
    }
    const result = subtractGeometry(target, cutter);
    if (result === undefined) {
      return;
    }
    useEditorStore.getState().subtractFeature(targetId, result);
  };

  // 후보에 hover하면 지도에서 그 도형을 강조(이미 hoveredFeatureId 기반 강조가 동작).
  const setHovered = (featureId: string | null) => {
    useEditorStore.getState().setHoveredFeatureId(featureId);
  };

  return { targetId, candidates, merge, subtract, setHovered };
}
