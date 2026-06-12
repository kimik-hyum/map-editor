import { useMemo } from "react";
import { useEditorStore } from "@/pages/editor/state/editorStore";
import { createLayerPanelViewModel } from "../model/layerPanelModel";

export function useLayerPanelViewModel() {
  const scene = useEditorStore((state) => state.scene);
  // 런타임 선택을 구독해 지도 클릭/패널 클릭 어느 쪽의 선택이든 행 하이라이트로 반영한다.
  const selectedFeatureIds = useEditorStore((state) => state.selectedFeatureIds);

  // 스토어 스냅샷은 깊은 readonly이며 뷰모델도 readonly 입력을 받으므로 캐스팅이 필요 없습니다.
  return useMemo(
    () => createLayerPanelViewModel(scene, selectedFeatureIds),
    [scene, selectedFeatureIds],
  );
}
