import { useCallback } from "react";
import { useEditorStore } from "@/pages/editor/state/editorStore";
import {
  getNextLayerVisibility,
  type FeatureStackRowViewModel,
} from "../model/layerPanelModel";

export function useLayerPanelActions() {
  const updateLayerView = useEditorStore((state) => state.updateLayerView);
  const setLayerLocked = useEditorStore((state) => state.setLayerLocked);
  const setSelectedFeatureIds = useEditorStore((state) => state.setSelectedFeatureIds);
  const requestFeatureFocus = useEditorStore((state) => state.requestFeatureFocus);

  // 행(도형)의 표시 토글. 1레이어 = 1도형이라 도형을 담은 내부 레이어의 표시를 바꾼다.
  const toggleRowVisibility = useCallback(
    (row: FeatureStackRowViewModel) => {
      updateLayerView(row.layerId, {
        visibility: getNextLayerVisibility(row.visibility),
      });
    },
    [updateLayerView],
  );

  // 행(도형)의 잠금 토글. 잠금 = 읽기 전용·참고용(선택은 유지되고 정점 핸들만 떨어진다).
  const toggleRowLock = useCallback(
    (row: FeatureStackRowViewModel) => {
      setLayerLocked(row.layerId, !row.isLocked);
    },
    [setLayerLocked],
  );

  // 패널 행 클릭 = 그 도형 선택(교체). 지도 클릭 선택과 같은 상태(selectedFeatureIds)를 쓴다.
  // 다시 클릭하면 해제한다(패널에서 선택을 끄는 유일한 손잡이).
  // 선택할 때는 그 도형이 보이도록 지도 이동도 함께 요청한다(숨김/해제 시에는 요청하지 않음).
  const selectFeature = useCallback(
    (row: FeatureStackRowViewModel) => {
      const current = useEditorStore.getState().selectedFeatureIds;
      const isOnlySelection = current.length === 1 && current[0] === row.id;
      if (isOnlySelection) {
        setSelectedFeatureIds([]);
        return;
      }
      setSelectedFeatureIds([row.id]);
      if (row.isVisible) {
        requestFeatureFocus(row.id);
      }
    },
    [requestFeatureFocus, setSelectedFeatureIds],
  );

  return {
    toggleRowVisibility,
    toggleRowLock,
    selectFeature,
  };
}
