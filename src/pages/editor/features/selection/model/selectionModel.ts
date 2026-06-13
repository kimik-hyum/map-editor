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
): string[] {
  if (additive) {
    return pickedId === null ? [...current] : toggleFeatureSelection(current, pickedId);
  }
  return pickedId === null ? [] : [pickedId];
}

// 편집(정점편집·이동) 대상 id 집합입니다.
// "정확히 1개"가 선택됐고 그 도형이 편집 가능(보임+편집가능+잠금해제)일 때만 그 id, 아니면 빈 집합.
// → 다중 선택·읽기 전용·숨김·잠금은 모두 빈 집합이라 편집 바인딩이 붙지 않습니다(하이라이트만).
export function getSingleEditableEditTargetIds(
  scene: DeepReadonly<EditorScene> | null,
  selectedIds: ReadonlySet<string>,
): Set<string> {
  if (!scene || selectedIds.size !== 1) {
    return new Set();
  }
  const [onlyId] = selectedIds;
  for (const layer of scene.layers) {
    for (const feature of layer.features) {
      if (feature.id === onlyId) {
        return canEditLayerVertices(scene as EditorScene, layer.id)
          ? new Set([onlyId])
          : new Set();
      }
    }
  }
  return new Set();
}
