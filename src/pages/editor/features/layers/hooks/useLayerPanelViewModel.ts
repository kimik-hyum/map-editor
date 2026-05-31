import { useMemo } from "react";
import { useEditorStore } from "@/pages/editor/state/editorStore";
import { createLayerPanelViewModel } from "../model/layerPanelModel";

export function useLayerPanelViewModel() {
  const scene = useEditorStore((state) => state.scene);
  const activeLayerId = useEditorStore((state) => state.activeLayerId);

  return useMemo(
    () => createLayerPanelViewModel(scene, activeLayerId),
    [activeLayerId, scene],
  );
}
