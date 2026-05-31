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

  return {
    toggleFeatureVisibility,
    toggleLayerVisibility,
  };
}
