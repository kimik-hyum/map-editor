import { useMemo } from "react";
import { useEditorStore } from "@/pages/editor/state/editorStore";
import type { EditorScene } from "@/pages/editor/types/editorTypes";
import { createLayerPanelViewModel } from "../model/layerPanelModel";

export function useLayerPanelViewModel() {
  const scene = useEditorStore((state) => state.scene);
  const activeLayerId = useEditorStore((state) => state.activeLayerId);

  return useMemo(
    // 스토어 스냅샷은 깊은 readonly. 뷰모델은 scene을 읽기만 하므로 경계에서 mutable로 캐스팅한다.
    () => createLayerPanelViewModel(scene as EditorScene | null, activeLayerId),
    [activeLayerId, scene],
  );
}
