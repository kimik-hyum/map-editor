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

// 선택한 도형(target) 기준으로 병합/제거/교집합 가능한 상대 후보를 도출합니다.
// - target은 "정확히 1개 선택"이고 편집 가능(보임+편집가능+잠금해제)한 폴리곤일 때만 채워집니다.
// - 병합 후보: 다른 편집 가능 폴리곤 전부(떨어져 있어도 후보 — union 시 MultiPolygon).
// - 제거 후보: 그중 target과 실제 면적이 겹치는 것만(제거 버튼은 이게 있을 때만 노출).
// - 교집합 후보: 제거와 마찬가지로 실제 면적이 겹치는 것만.
// - visibleFeatureIds를 주면 그 집합(보통 "화면 안" 피처)으로 후보를 한정합니다 — 칩/마커는
//   화면에 보여야 클릭 가능하므로, 수천 개가 로드돼도 화면 밖은 비교 대상에서 뺍니다.
//   같은 기준을 target에도 적용합니다: 선택 도형이 화면 밖이면 아무 칩도 띄우지 않습니다.
//   (후보만 걸러내면 target이 화면 밖인데 다른 폴리곤 위에 칩이 떠 "눈앞 도형 기준"으로
//   오해할 수 있어, "칩이 보이는 동안 target도 현재 화면 안"이라는 기대를 지킵니다.)
//   생략(undefined)하면 viewport 제한 없이 scene 전체에서 후보를 찾습니다(테스트·비지도 호출).
export type GeometryOpTargets = {
  targetId: string | null;
  mergeCandidateIds: string[];
  subtractCandidateIds: string[];
  intersectCandidateIds: string[];
};

const EMPTY: GeometryOpTargets = {
  targetId: null,
  mergeCandidateIds: [],
  subtractCandidateIds: [],
  intersectCandidateIds: [],
};

type PolygonEntry = { id: string; geometry: PolygonalGeometry };

function* editablePolygons(scene: DeepReadonly<EditorScene>): Generator<PolygonEntry> {
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
      yield { id: feature.id, geometry };
    }
  }
}

// ID/geometry 조회는 후보 교집합 계산과 분리합니다. 경계 채택·비동기 작업 검증에서도
// 이 함수만 호출해야 다른 편집 도형 전체와 정밀 교차 연산을 수행하지 않습니다.
export function findGeometryOpTarget(
  scene: DeepReadonly<EditorScene> | null,
  selectedIds: ReadonlySet<string>,
  visibleFeatureIds?: ReadonlySet<string> | null,
): PolygonEntry | null {
  if (!scene || selectedIds.size !== 1) return null;
  const [targetId] = selectedIds;
  if (visibleFeatureIds && !visibleFeatureIds.has(targetId)) return null;
  for (const entry of editablePolygons(scene)) {
    if (entry.id === targetId) return entry;
  }
  return null;
}

function checkAreaOverlap(a: PolygonalGeometry, b: PolygonalGeometry): boolean {
  return bboxesOverlap(geometryBbox(a), geometryBbox(b)) && hasAreaOverlap(a, b);
}

export function deriveGeometryOpTargets(
  scene: DeepReadonly<EditorScene> | null,
  selectedIds: ReadonlySet<string>,
  visibleFeatureIds?: ReadonlySet<string> | null,
  checkOverlap = checkAreaOverlap,
): GeometryOpTargets {
  const target = findGeometryOpTarget(scene, selectedIds, visibleFeatureIds);
  if (!scene || !target) return EMPTY;

  // viewport는 후보의 표시 여부만 결정합니다. 호출자는 geometry 쌍별 판정 캐시를
  // 주입하여 팬/줌 때 이미 검사한 후보의 bbox·정밀 교집합을 다시 계산하지 않습니다.
  const mergeCandidateIds: string[] = [];
  const subtractCandidateIds: string[] = [];
  const intersectCandidateIds: string[] = [];
  for (const candidate of editablePolygons(scene)) {
    if (candidate.id === target.id) {
      continue;
    }
    // viewport 제한: 화면 안 피처 집합이 주어지면 그 밖의 후보는 비교 대상에서 제외한다.
    if (visibleFeatureIds && !visibleFeatureIds.has(candidate.id)) {
      continue;
    }
    mergeCandidateIds.push(candidate.id);
    if (checkOverlap(target.geometry, candidate.geometry)) {
      subtractCandidateIds.push(candidate.id);
      intersectCandidateIds.push(candidate.id);
    }
  }

  return {
    targetId: target.id,
    mergeCandidateIds,
    subtractCandidateIds,
    intersectCandidateIds,
  };
}

// 후보 폴리곤마다 화면 마커 입력(표시명 + 겹침 연산 가능 여부)을 만듭니다.
// name은 칩 윗행에 표시합니다. 이름이 없으면 OL 라벨과 같은 규칙으로 id를 폴백해
// 식별자가 사라지지 않게 합니다(이름 행은 항상 채워짐 → 이름 없는 도형이 후보가 돼도
// "feature-4" 같은 식별자가 남는다). 칩 화면 위치(내부 대표점)는 ol/Overlay 어댑터가
// OL geometry에서 직접 계산하므로 여기서는 좌표를 주지 않습니다.
type GeometryOpMarkerInput = {
  featureId: string;
  name: string;
  canSubtract: boolean;
  canIntersect: boolean;
};

export function buildGeometryOpMarkerInputs(
  scene: DeepReadonly<EditorScene> | null,
  targets: GeometryOpTargets,
): GeometryOpMarkerInput[] {
  if (!scene) {
    return [];
  }
  const subtractable = new Set(targets.subtractCandidateIds);
  const intersectable = new Set(targets.intersectCandidateIds);
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
    canIntersect: intersectable.has(featureId),
  }));
}
