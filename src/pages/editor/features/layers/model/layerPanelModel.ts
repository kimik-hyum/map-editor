import { resolvePolygonStyle } from "@/pages/editor/theme/editorStyleResolver";
import {
  LockState,
  VisibilityState,
  geometryKindLabels,
  type DeepReadonly,
  type EditorScene,
  type EditorFeature,
  type EditorLayer,
} from "@/pages/editor/types/editorTypes";

// 1레이어 = 1도형 구조의 평탄 스택 행입니다. 패널은 이 행 목록을 위(맨 앞)부터 그립니다.
export type FeatureStackRowViewModel = {
  // 도형 id(선택·포커스의 키).
  id: string;
  // 도형을 담은 내부 레이어 id(표시 토글의 키).
  layerId: string;
  name: string;
  // 시각 스택 순위 라벨(#1 = 맨 위).
  orderLabel: string;
  geometryKindLabel: string;
  // 표시 토글 다음 상태 계산에 쓰는 현재 표시 상태.
  visibility: VisibilityState;
  isVisible: boolean;
  isDimmed: boolean;
  // 잠금 = 읽기 전용·참고용.
  isLocked: boolean;
  // 순서 이동 가능 여부(맨 위 행은 위로, 맨 아래 행은 아래로 이동 불가).
  canMoveUp: boolean;
  canMoveDown: boolean;
  // 런타임 선택(selectedFeatureIds) 기준. 지도/패널 어느 쪽 선택이든 같은 값을 본다.
  isSelected: boolean;
  accentColor: string;
};

export type LayerPanelViewModel = {
  isReady: boolean;
  isEmpty: boolean;
  featureCount: number;
  rows: FeatureStackRowViewModel[];
};

// 표시 토글의 다음 상태입니다. Hidden이면 Visible로, 그 외(Visible/Dimmed)는 Hidden으로 전환합니다.
export function getNextLayerVisibility(visibility: VisibilityState) {
  return visibility === VisibilityState.Hidden
    ? VisibilityState.Visible
    : VisibilityState.Hidden;
}

function getFeatureName(feature: DeepReadonly<EditorFeature>) {
  const propertyLabel = feature.feature.properties?.label;

  if (feature.name) {
    return feature.name;
  }

  if (typeof propertyLabel === "string" && propertyLabel.trim().length > 0) {
    return propertyLabel;
  }

  return feature.id;
}

function createFeatureStackRowViewModel(
  layer: DeepReadonly<EditorLayer>,
  feature: DeepReadonly<EditorFeature>,
  selectedIds: ReadonlySet<string>,
  stackIndex: number,
): FeatureStackRowViewModel {
  return {
    id: feature.id,
    layerId: layer.id,
    name: getFeatureName(feature),
    orderLabel: `#${stackIndex + 1}`,
    geometryKindLabel: geometryKindLabels[feature.geometryKind],
    visibility: layer.view.visibility,
    isVisible: layer.view.visibility !== VisibilityState.Hidden,
    isDimmed: layer.view.visibility === VisibilityState.Dimmed,
    isLocked: layer.behavior.lock === LockState.Locked,
    // 위/아래 이동 가능 여부는 전체 행이 모인 뒤 위치 기준으로 다시 채워진다.
    canMoveUp: false,
    canMoveDown: false,
    isSelected: selectedIds.has(feature.id),
    // 스타일 리졸버는 읽기 전용 입력을 받지 않으므로 경계에서 mutable로 캐스팅한다(변경하지 않음).
    accentColor: resolvePolygonStyle(feature as EditorFeature, layer as EditorLayer)
      .strokeColor,
  };
}

// zIndex 높은 순(=화면에서 위) → 패널 맨 위. 동률이면 원본 순서를 유지합니다.
function getLayersByVisualStack(scene: DeepReadonly<EditorScene>) {
  return scene.layers
    .map((layer, sourceIndex) => ({ layer, sourceIndex }))
    .sort((left, right) => {
      const zIndexDiff = right.layer.view.zIndex - left.layer.view.zIndex;

      return zIndexDiff === 0 ? left.sourceIndex - right.sourceIndex : zIndexDiff;
    });
}

export function createLayerPanelViewModel(
  scene: DeepReadonly<EditorScene> | null,
  selectedFeatureIds: readonly string[] = [],
): LayerPanelViewModel {
  if (!scene) {
    return {
      isReady: false,
      isEmpty: true,
      featureCount: 0,
      rows: [],
    };
  }

  const selectedIds = new Set(selectedFeatureIds);
  const rows = getLayersByVisualStack(scene)
    .flatMap(({ layer }, stackIndex) =>
      layer.features.map((feature) =>
        createFeatureStackRowViewModel(layer, feature, selectedIds, stackIndex),
      ),
    )
    .map((row, index, all) => ({
      ...row,
      canMoveUp: index > 0,
      canMoveDown: index < all.length - 1,
    }));

  return {
    isReady: true,
    isEmpty: rows.length === 0,
    featureCount: rows.length,
    rows,
  };
}
