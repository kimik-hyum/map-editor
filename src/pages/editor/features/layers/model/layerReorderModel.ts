import type { DeepReadonly, EditorLayer } from "@/pages/editor/types/editorTypes";

// 평탄 스택(1레이어 = 1도형)의 순서 변경 계산입니다. 순수 함수이며 React/OpenLayers를 모릅니다.
// 이동은 "스왑"이 아니라 시각 순서 전체에 쌓임 값을 다시 부여(재정규화)합니다 —
// 호스트가 준 임의 값·동률이 한 번에 깨끗해지고, 버튼(▲▼)과 드래그가 같은 계산을 공유합니다.

type ReadonlyLayers = readonly DeepReadonly<EditorLayer>[];

export type LayerZIndexUpdate = {
  layerId: string;
  zIndex: number;
};

// 시각 스택(위→아래) 순서의 레이어 id 목록. 패널 정렬과 같은 규칙(쌓임 값 내림차순, 동률은 원본 순서).
export function getVisualStackOrder(layers: ReadonlyLayers): string[] {
  return layers
    .map((layer, sourceIndex) => ({ layer, sourceIndex }))
    .sort((left, right) => {
      const zIndexDiff = right.layer.view.zIndex - left.layer.view.zIndex;
      return zIndexDiff === 0 ? left.sourceIndex - right.sourceIndex : zIndexDiff;
    })
    .map(({ layer }) => layer.id);
}

// 시각 스택(위→아래) 순서를 받아 전체 쌓임 값을 재부여합니다. 맨 위 = 개수×10, 맨 아래 = 10.
export function getStackZIndexUpdates(
  orderedLayerIds: readonly string[],
): LayerZIndexUpdate[] {
  const total = orderedLayerIds.length;
  return orderedLayerIds.map((layerId, index) => ({
    layerId,
    zIndex: (total - index) * 10,
  }));
}

// 드래그 드롭 결과(끌던 행을 대상 행 위치로)의 쌓임 값 갱신 목록. 무의미한 드롭이면 null.
export function reorderLayerInStack(
  layers: ReadonlyLayers,
  activeLayerId: string,
  overLayerId: string,
): LayerZIndexUpdate[] | null {
  if (activeLayerId === overLayerId) {
    return null;
  }
  const order = getVisualStackOrder(layers);
  const from = order.indexOf(activeLayerId);
  const to = order.indexOf(overLayerId);
  if (from === -1 || to === -1) {
    return null;
  }

  const next = [...order];
  next.splice(from, 1);
  next.splice(to, 0, activeLayerId);
  return getStackZIndexUpdates(next);
}
