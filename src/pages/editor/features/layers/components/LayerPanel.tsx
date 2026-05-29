import { FloatingPanel } from "../../../components/FloatingPanel";
import { useLayerPanelViewModel } from "../hooks/useLayerPanelViewModel";
import { LayerList } from "./LayerList";

export function LayerPanel() {
  const viewModel = useLayerPanelViewModel();

  return (
    <FloatingPanel
      title="레이어"
      defaultPosition={{ x: 24, y: 24 }}
      defaultSize={{ width: 360, height: 520 }}
      minHeight={320}
      minWidth={320}
    >
      <LayerList viewModel={viewModel} />
    </FloatingPanel>
  );
}
