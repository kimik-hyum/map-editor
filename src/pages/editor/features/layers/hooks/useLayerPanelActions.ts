import { useCallback } from "react";
import { toggleFeatureSelection } from "@/pages/editor/features/selection";
import { useEditorStore } from "@/pages/editor/state/editorStore";
import { confirmDialog } from "@/shared/ui/confirmation-dialog";
import {
  getNextLayerVisibility,
  type FeatureStackRowViewModel,
} from "../model/layerPanelModel";
import { reorderLayerInStack } from "../model/layerReorderModel";

export function useLayerPanelActions() {
  const updateLayerView = useEditorStore((state) => state.updateLayerView);
  const updateLayerZIndexes = useEditorStore((state) => state.updateLayerZIndexes);
  const setLayerLocked = useEditorStore((state) => state.setLayerLocked);
  const setSelectedFeatureIds = useEditorStore((state) => state.setSelectedFeatureIds);
  const requestFeatureFocus = useEditorStore((state) => state.requestFeatureFocus);
  const deleteCreatedFeature = useEditorStore((state) => state.deleteCreatedFeature);

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

  // 패널 행 클릭 = 그 도형 선택. 지도 클릭 선택과 같은 상태(selectedFeatureIds)를 쓴다.
  // - 보조키(Cmd/Ctrl): 선택에 추가/제거(토글). 세트 구성 중이므로 지도 포커스는 옮기지 않는다.
  // - 일반: 그 도형으로 교체(이미 단독 선택이면 해제). 새로 선택되면 지도 포커스를 옮긴다.
  const selectFeature = useCallback(
    (row: FeatureStackRowViewModel, additive: boolean) => {
      const current = useEditorStore.getState().selectedFeatureIds;
      if (additive) {
        setSelectedFeatureIds(toggleFeatureSelection(current, row.id));
        return;
      }
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

  // 드래그 드롭 결과 반영(끌던 행을 대상 행 위치로). 버튼 이동과 같은 재정규화 계산을 쓴다.
  const reorderRow = useCallback(
    (activeLayerId: string, overLayerId: string) => {
      const scene = useEditorStore.getState().scene;
      if (!scene) {
        return;
      }
      const updates = reorderLayerInStack(scene.layers, activeLayerId, overLayerId);
      if (updates) {
        updateLayerZIndexes(updates);
      }
    },
    [updateLayerZIndexes],
  );

  // 부모 원본에는 버튼이 없고, 로컬 생성 레이어만 확인 후 삭제합니다.
  // 확인 중 새 INIT/scene 변경이 생기면 오래된 행을 삭제하지 않습니다.
  const deleteRow = useCallback(
    async (row: FeatureStackRowViewModel) => {
      if (!row.canDelete) {
        return;
      }
      const contextAtRequest = useEditorStore.getState();
      const confirmed = await confirmDialog({
        title: `“${row.name}” 레이어를 삭제할까요?`,
        description: "생성한 도형이 함께 삭제됩니다. 실행 취소로 복원할 수 있습니다.",
        confirmLabel: "삭제",
        cancelLabel: "취소",
        tone: "danger",
        initialFocus: "cancel",
      });
      const currentContext = useEditorStore.getState();
      if (
        !confirmed ||
        currentContext.scene !== contextAtRequest.scene ||
        currentContext.sessionId !== contextAtRequest.sessionId
      ) {
        return;
      }
      deleteCreatedFeature(row.id);
    },
    [deleteCreatedFeature],
  );

  return {
    toggleRowVisibility,
    toggleRowLock,
    selectFeature,
    reorderRow,
    deleteRow,
  };
}
