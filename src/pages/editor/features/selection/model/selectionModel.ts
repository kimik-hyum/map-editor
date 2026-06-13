import {
  canEditLayerVertices,
  type DeepReadonly,
  type EditorScene,
} from "@/pages/editor/types/editorTypes";

// 대칭차: 새로 선택되었거나 선택 해제된 id만 모읍니다.
export function getChangedSelectionIds(
  previous: ReadonlySet<string>,
  next: ReadonlySet<string>,
): string[] {
  const changedIds: string[] = [];

  for (const id of previous) {
    if (!next.has(id)) {
      changedIds.push(id);
    }
  }
  for (const id of next) {
    if (!previous.has(id)) {
      changedIds.push(id);
    }
  }

  return changedIds;
}

// id가 이미 있으면 제거, 없으면 추가합니다(기존 순서 유지). 다중 선택 토글용.
export function toggleFeatureSelection(
  current: readonly string[],
  id: string,
): string[] {
  return current.includes(id)
    ? current.filter((value) => value !== id)
    : [...current, id];
}

// Cmd(macOS)/Ctrl(기타)을 누른 클릭이면 "다중 선택 토글"로 본다.
// Shift는 현재 토글에 쓰지 않는다(향후 박스/범위 선택용으로 비워둠).
export function isToggleSelectionModifier(modifiers: {
  metaKey: boolean;
  ctrlKey: boolean;
}): boolean {
  return modifiers.metaKey || modifiers.ctrlKey;
}

// 클릭 한 번의 선택 결과를 계산합니다.
// - 보조키(additive): 빈 곳은 그대로 두고(no-op, 실수 전체 해제 방지) 도형은 추가/제거.
// - 일반: 집은 도형으로 교체(빈 곳은 전체 해제).
export function resolveSelection(
  current: readonly string[],
  pickedId: string | null,
  additive: boolean,
): readonly string[] {
  if (additive) {
    // 보조키+빈 곳은 진짜 no-op: 같은 참조를 그대로 반환해 불필요한 store 갱신/리렌더를 막는다.
    return pickedId === null ? current : toggleFeatureSelection(current, pickedId);
  }
  return pickedId === null ? [] : [pickedId];
}

// 선택으로부터 두 편집 대상 집합을 한 번의 scene 순회로 도출합니다.
// - vertexEditTargetIds: 정점편집·삽입/삭제·편집 힌트·정점 오버레이용.
//   "정확히 1개"가 선택됐고 그 도형이 편집 가능(보임+편집가능+잠금해제)일 때만 그 id.
// - translateTargetIds: 몸통 드래그 이동용. 선택된 것 중 편집 가능한 도형 "전부"(다중 허용).
// → 다중 선택은 하이라이트 + 몸통 이동까지 허용하되, 정점 단위 편집은 1개일 때만 붙습니다.
//   읽기 전용·숨김·잠금 도형은 두 집합 모두에서 빠집니다.
export type SelectionTargets = {
  vertexEditTargetIds: Set<string>;
  translateTargetIds: Set<string>;
};

export function deriveSelectionTargets(
  scene: DeepReadonly<EditorScene> | null,
  selectedIds: ReadonlySet<string>,
): SelectionTargets {
  if (!scene || selectedIds.size === 0) {
    return { vertexEditTargetIds: new Set(), translateTargetIds: new Set() };
  }

  // 이동 대상: 선택된 것 중 편집 가능한(보임+편집가능+잠금해제) 도형 전부.
  const translateTargetIds = new Set<string>();
  for (const layer of scene.layers) {
    if (!canEditLayerVertices(scene as EditorScene, layer.id)) {
      continue;
    }
    for (const feature of layer.features) {
      if (selectedIds.has(feature.id)) {
        translateTargetIds.add(feature.id);
      }
    }
  }

  // 정점 편집 대상: 정확히 1개만 선택됐을 때만.
  // size===1이면 translateTargetIds는 그 한 개이거나(편집 가능) 비어 있음(불가) — 둘 다 올바른 결과.
  const vertexEditTargetIds =
    selectedIds.size === 1 ? new Set(translateTargetIds) : new Set<string>();

  return { vertexEditTargetIds, translateTargetIds };
}
