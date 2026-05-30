import { useCallback } from "react";
import { useEditorStore } from "../../../state/editorStore";
import {
  getNextFeatureVisibility,
  type LayerFeatureListItemViewModel,
} from "../model/layerPanelModel";

export function useLayerPanelActions() {
  const updateFeatureView = useEditorStore((state) => state.updateFeatureView);

  const toggleFeatureVisibility = useCallback(
    (feature: LayerFeatureListItemViewModel) => {
      updateFeatureView(feature.id, {
        visibility: getNextFeatureVisibility(feature.visibility),
      });
    },
    [updateFeatureView],
  );

  return {
    toggleFeatureVisibility,
  };
}
