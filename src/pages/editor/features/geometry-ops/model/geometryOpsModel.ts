import {
  canEditLayerVertices,
  isPolygonalGeometry,
  type DeepReadonly,
  type EditorScene,
  type GeoJsonGeometry,
  type PolygonalGeometry,
} from "@/pages/editor/types/editorTypes";
import { hasAreaOverlap } from "./booleanOps";

// 선택한 도형(target) 기준으로 병합/제거 가능한 상대 후보를 도출합니다.
// - target은 "정확히 1개 선택"이고 편집 가능(보임+편집가능+잠금해제)한 폴리곤일 때만 채워집니다.
// - 병합 후보: 다른 편집 가능 폴리곤 전부(떨어져 있어도 후보 — union 시 MultiPolygon).
// - 제거 후보: 그중 target과 실제 면적이 겹치는 것만(제거 버튼은 이게 있을 때만 노출).
export type GeometryOpTargets = {
  targetId: string | null;
  mergeCandidateIds: string[];
  subtractCandidateIds: string[];
};

const EMPTY: GeometryOpTargets = {
  targetId: null,
  mergeCandidateIds: [],
  subtractCandidateIds: [],
};

type PolygonEntry = { id: string; geometry: PolygonalGeometry };

export function deriveGeometryOpTargets(
  scene: DeepReadonly<EditorScene> | null,
  selectedIds: ReadonlySet<string>,
): GeometryOpTargets {
  if (!scene || selectedIds.size !== 1) {
    return EMPTY;
  }
  const [targetId] = selectedIds;

  // 편집 가능(보임+편집가능+잠금해제)하고 폴리곤인 도형만 모읍니다(target 포함).
  const polygons: PolygonEntry[] = [];
  let target: PolygonEntry | null = null;
  for (const layer of scene.layers) {
    if (!canEditLayerVertices(scene as EditorScene, layer.id)) {
      continue;
    }
    for (const feature of layer.features) {
      const geometry = feature.feature.geometry as GeoJsonGeometry;
      if (!isPolygonalGeometry(geometry)) {
        continue;
      }
      const entry: PolygonEntry = { id: feature.id, geometry };
      polygons.push(entry);
      if (feature.id === targetId) {
        target = entry;
      }
    }
  }

  if (!target) {
    return EMPTY;
  }

  const mergeCandidateIds: string[] = [];
  const subtractCandidateIds: string[] = [];
  for (const candidate of polygons) {
    if (candidate.id === target.id) {
      continue;
    }
    mergeCandidateIds.push(candidate.id);
    if (hasAreaOverlap(target.geometry, candidate.geometry)) {
      subtractCandidateIds.push(candidate.id);
    }
  }

  return { targetId: target.id, mergeCandidateIds, subtractCandidateIds };
}
