import {
  canEditLayerVertices,
  isPolygonalGeometry,
  VisibilityState,
  type DeepReadonly,
  type EditorScene,
  type GeoJsonGeometry,
  type PolygonalGeometry,
} from "@/pages/editor/types/editorTypes";
import { bboxesOverlap, geometryBbox, hasAreaOverlap } from "./booleanOps";

// 선택한 도형(target) 기준으로 병합/제거 가능한 상대 후보를 도출합니다.
// - target은 "정확히 1개 선택"이고 편집 가능(보임+편집가능+잠금해제)한 폴리곤일 때만 채워집니다.
// - 병합 후보: 다른 편집 가능 폴리곤 전부(떨어져 있어도 후보 — union 시 MultiPolygon).
// - 제거 후보: 그중 target과 실제 면적이 겹치는 것만(제거 버튼은 이게 있을 때만 노출).
// - visibleFeatureIds를 주면 그 집합(보통 "화면 안" 피처)으로 후보를 한정합니다 — 칩/마커는
//   화면에 보여야 클릭 가능하므로, 수천 개가 로드돼도 화면 밖은 비교 대상에서 뺍니다.
//   생략(undefined)하면 viewport 제한 없이 scene 전체에서 후보를 찾습니다(테스트·비지도 호출).
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
  visibleFeatureIds?: ReadonlySet<string> | null,
): GeometryOpTargets {
  if (!scene || selectedIds.size !== 1) {
    return EMPTY;
  }
  const [targetId] = selectedIds;

  // 편집 가능(보임+편집가능+잠금해제)하고 폴리곤인 도형만 모읍니다(target 포함).
  // 레이어 가시성 외에 "도형별 숨김"도 제외합니다 — 렌더러/정점 오버레이와 같은 기준이라,
  // 안 보이는 도형 위에 마커가 뜨거나 연산 대상이 되지 않게 합니다.
  const polygons: PolygonEntry[] = [];
  let target: PolygonEntry | null = null;
  for (const layer of scene.layers) {
    if (!canEditLayerVertices(scene as EditorScene, layer.id)) {
      continue;
    }
    for (const feature of layer.features) {
      if (feature.view?.visibility === VisibilityState.Hidden) {
        continue;
      }
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

  // broad-phase: target의 bbox를 한 번 구해두고, 후보 bbox와 박스부터 비교한다.
  // 박스가 안 겹치는 후보는 무거운 면적 교차(hasAreaOverlap = Turf intersect+area)를 건너뛴다.
  // → 경계처럼 폴리곤이 많아도 실제로 가까운 소수에만 정밀 검사가 돈다(narrow-phase).
  const targetBbox = geometryBbox(target.geometry);
  const mergeCandidateIds: string[] = [];
  const subtractCandidateIds: string[] = [];
  for (const candidate of polygons) {
    if (candidate.id === target.id) {
      continue;
    }
    // viewport 제한: 화면 안 피처 집합이 주어지면 그 밖의 후보는 비교 대상에서 제외한다.
    if (visibleFeatureIds && !visibleFeatureIds.has(candidate.id)) {
      continue;
    }
    mergeCandidateIds.push(candidate.id);
    if (
      bboxesOverlap(targetBbox, geometryBbox(candidate.geometry)) &&
      hasAreaOverlap(target.geometry, candidate.geometry)
    ) {
      subtractCandidateIds.push(candidate.id);
    }
  }

  return { targetId: target.id, mergeCandidateIds, subtractCandidateIds };
}

// 후보 폴리곤마다 화면 마커 입력(표시명 + 제거 가능 여부)을 만듭니다.
// name은 칩 윗행에 표시합니다. 이름이 없으면 OL 라벨과 같은 규칙으로 id를 폴백해
// 식별자가 사라지지 않게 합니다(이름 행은 항상 채워짐 → 이름 없는 도형이 후보가 돼도
// "feature-4" 같은 식별자가 남는다). 칩 화면 위치(내부 대표점)는 ol/Overlay 어댑터가
// OL geometry에서 직접 계산하므로 여기서는 좌표를 주지 않습니다.
type GeometryOpMarkerInput = {
  featureId: string;
  name: string;
  canSubtract: boolean;
};

export function buildGeometryOpMarkerInputs(
  scene: DeepReadonly<EditorScene> | null,
  targets: GeometryOpTargets,
): GeometryOpMarkerInput[] {
  if (!scene) {
    return [];
  }
  const subtractable = new Set(targets.subtractCandidateIds);
  const nameById = new Map<string, string | undefined>();
  for (const layer of scene.layers) {
    for (const feature of layer.features) {
      nameById.set(feature.id, feature.name);
    }
  }

  return targets.mergeCandidateIds.map((featureId) => ({
    featureId,
    name: nameById.get(featureId) ?? featureId,
    canSubtract: subtractable.has(featureId),
  }));
}
