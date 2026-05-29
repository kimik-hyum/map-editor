import { useMemo } from "react";
import { useEditorStore } from "../../../state/editorStore";
import { createLayerPanelViewModel } from "../model/layerPanelModel";

export function useLayerPanelViewModel() {
  const document = useEditorStore((state) => state.document);
  const activeLayerId = useEditorStore((state) => state.activeLayerId);

  return useMemo(
    () => createLayerPanelViewModel(document, activeLayerId),
    [activeLayerId, document],
  );
}
