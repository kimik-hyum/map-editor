import { FloatingPanel } from "../../../components/FloatingPanel";
import { SegmentedTabs } from "../../../components/SegmentedTabs";
import { useLayerPanelActions } from "../hooks/useLayerPanelActions";
import { useLayerPanelViewModel } from "../hooks/useLayerPanelViewModel";
import { LayerFeatureSummary } from "./LayerFeatureSummary";
import { LayerList } from "./LayerList";

export function LayerPanel() {
  const viewModel = useLayerPanelViewModel();
  const { toggleFeatureVisibility } = useLayerPanelActions();

  return (
    <FloatingPanel
      title="레이어"
      defaultPosition={{ x: 24, y: 24 }}
      defaultSize={{ width: 360, height: 520 }}
      minHeight={320}
      minWidth={320}
    >
      <SegmentedTabs.Root
        className="flex h-full min-h-0 flex-col"
        defaultValue="layers"
      >
        <SegmentedTabs.List className="grid-cols-2">
          <SegmentedTabs.Tab value="layers">레이어</SegmentedTabs.Tab>
          <SegmentedTabs.Tab value="features">도형</SegmentedTabs.Tab>
        </SegmentedTabs.List>

        <SegmentedTabs.Panel
          className="mt-3 min-h-0 flex-1 overflow-auto"
          value="layers"
        >
          <LayerList
            viewModel={viewModel}
            onToggleFeatureVisibility={toggleFeatureVisibility}
          />
        </SegmentedTabs.Panel>
        <SegmentedTabs.Panel
          className="mt-3 min-h-0 flex-1 overflow-auto"
          value="features"
        >
          <LayerFeatureSummary
            viewModel={viewModel}
            onToggleFeatureVisibility={toggleFeatureVisibility}
          />
        </SegmentedTabs.Panel>
      </SegmentedTabs.Root>
    </FloatingPanel>
  );
}
