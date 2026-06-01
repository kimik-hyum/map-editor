import { useMemo } from "react";
import { useEditorStore } from "@/pages/editor/state/editorStore";
import { createLayerPanelViewModel } from "../model/layerPanelModel";

export function useLayerPanelViewModel() {
  const scene = useEditorStore((state) => state.scene);
  const activeLayerId = useEditorStore((state) => state.activeLayerId);

  // 스토어 스냅샷은 깊은 readonly이며 뷰모델도 readonly 입력을 받으므로 캐스팅이 필요 없습니다.
  return useMemo(
    () => createLayerPanelViewModel(scene, activeLayerId),
    [activeLayerId, scene],
  );
}
