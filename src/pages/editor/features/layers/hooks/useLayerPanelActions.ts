import { useCallback } from "react";
import { useEditorStore } from "@/pages/editor/state/editorStore";
import {
  getNextFeatureVisibility,
  getNextLayerVisibility,
  type LayerFeatureListItemViewModel,
  type LayerListItemViewModel,
} from "../model/layerPanelModel";

export function useLayerPanelActions() {
  const updateFeatureView = useEditorStore((state) => state.updateFeatureView);
  const updateLayerView = useEditorStore((state) => state.updateLayerView);
  const setSelectedFeatureIds = useEditorStore((state) => state.setSelectedFeatureIds);
  const setActiveLayerId = useEditorStore((state) => state.setActiveLayerId);
  const requestFeatureFocus = useEditorStore((state) => state.requestFeatureFocus);

  const toggleFeatureVisibility = useCallback(
    (feature: LayerFeatureListItemViewModel) => {
      updateFeatureView(feature.id, {
        visibility: getNextFeatureVisibility(feature.visibility),
      });
    },
    [updateFeatureView],
  );

  const toggleLayerVisibility = useCallback(
    (layer: LayerListItemViewModel) => {
      updateLayerView(layer.id, {
        visibility: getNextLayerVisibility(layer.visibility),
      });
    },
    [updateLayerView],
  );

  // 패널 도형 행 클릭 = 그 도형 선택(교체). 지도 클릭 선택과 같은 상태(selectedFeatureIds)를 쓴다.
  // 다시 클릭하면 해제한다(패널에서 선택을 끄는 유일한 손잡이).
  // 선택할 때는 그 도형이 보이도록 지도 이동도 함께 요청한다(해제 시에는 요청하지 않음).
  const selectFeature = useCallback(
    (feature: LayerFeatureListItemViewModel) => {
      const current = useEditorStore.getState().selectedFeatureIds;
      const isOnlySelection = current.length === 1 && current[0] === feature.id;
      if (isOnlySelection) {
        setSelectedFeatureIds([]);
        return;
      }
      setSelectedFeatureIds([feature.id]);
      // 숨긴 도형은 지도에서 보이지 않으므로 포커스 이동을 걸지 않는다(선택·하이라이트 상태만 유지).
      if (feature.isVisible) {
        requestFeatureFocus(feature.id);
      }
    },
    [requestFeatureFocus, setSelectedFeatureIds],
  );

  // 패널 레이어 행 클릭 = 활성(포커스) 레이어 지정. 도형 선택과는 별개 상태다.
  const activateLayer = useCallback(
    (layer: LayerListItemViewModel) => {
      setActiveLayerId(layer.id);
    },
    [setActiveLayerId],
  );

  return {
    toggleFeatureVisibility,
    toggleLayerVisibility,
    selectFeature,
    activateLayer,
  };
}
