import type { DeepReadonly } from "./deepReadonly";
import {
  EditabilityState,
  FeatureLifecycle,
  LockState,
  VisibilityState,
} from "./enums";
import type { EditorFeature, EditorLayer, EditorScene } from "./scene";

// 레이어 접근 정책을 한곳에 모은 순수 scene 판정입니다.
// OpenLayers/React에 의존하지 않으므로 어댑터와 기능이 함께 import할 수 있습니다.
// (어댑터는 features/*를 import하지 않으므로, 공통 판정은 더 하위인 types에 둡니다.)

function findLayer(scene: EditorScene, layerId: string) {
  return scene.layers.find((candidate) => candidate.id === layerId);
}

// 선택/호버 대상: 편집 가능 + 잠금 해제.
// 보임 여부는 보지 않는다 — 선택은 OpenLayers 히트테스트로 일어나는데
// 숨김 레이어의 피처는 애초에 렌더되지 않아 픽킹되지 않기 때문이다.
export function canSelectLayer(scene: EditorScene, layerId: string): boolean {
  const layer = findLayer(scene, layerId);
  if (!layer) {
    return false;
  }
  return (
    layer.behavior.editability === EditabilityState.Editable &&
    layer.behavior.lock === LockState.Unlocked
  );
}

// 정점 편집 대상: 보임 + 편집 가능 + 잠금 해제.
// 선택은 id로 강제 재바인딩되므로, 선택 후 레이어를 숨기거나 잠그면
// 편집 대상에서 명시적으로 빠져야 한다(보임 조건을 추가로 본다).
export function canEditLayerVertices(scene: EditorScene, layerId: string): boolean {
  const layer = findLayer(scene, layerId);
  if (!layer) {
    return false;
  }
  return (
    layer.view.visibility !== VisibilityState.Hidden &&
    layer.behavior.editability === EditabilityState.Editable &&
    layer.behavior.lock === LockState.Unlocked
  );
}

// 이름은 geometry와 별개의 편집 메타데이터지만, 잠금/읽기 전용 정책은 동일하게 따릅니다.
// 숨김 도형도 패널에서는 접근할 수 있으므로 visibility는 이름 변경 권한에 포함하지 않습니다.
export function canRenameFeature(
  layer: DeepReadonly<EditorLayer>,
  feature: DeepReadonly<EditorFeature>,
): boolean {
  return (
    feature.state.lifecycle !== FeatureLifecycle.Deleted &&
    feature.behavior?.editability !== EditabilityState.Readonly &&
    layer.behavior.editability === EditabilityState.Editable &&
    layer.behavior.lock === LockState.Unlocked
  );
}

// 부모가 준 원본(Clean/Updated)은 보호하고, 에디터에서 새로 만든 도형만 삭제합니다.
// 레이어 권한과 잠금도 함께 확인해 UI와 store가 같은 정책을 사용하게 합니다.
export function canDeleteCreatedFeature(
  layer: DeepReadonly<EditorLayer>,
  feature: DeepReadonly<EditorFeature>,
): boolean {
  return (
    feature.state.lifecycle === FeatureLifecycle.Created &&
    feature.behavior?.deletable !== false &&
    layer.behavior.deletable &&
    layer.behavior.lock === LockState.Unlocked
  );
}
