import type {
  LayerFeatureListItemViewModel,
  LayerPanelViewModel,
} from "../model/layerPanelModel";
import { LayerFeatureSummaryRow } from "./LayerFeatureSummaryRow";

type LayerFeatureSummaryProps = {
  viewModel: LayerPanelViewModel;
  onToggleFeatureVisibility: (feature: LayerFeatureListItemViewModel) => void;
  onSelectFeature: (feature: LayerFeatureListItemViewModel) => void;
};

export function LayerFeatureSummary({
  viewModel,
  onToggleFeatureVisibility,
  onSelectFeature,
}: LayerFeatureSummaryProps) {
  if (!viewModel.isReady) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-sm font-bold text-slate-500">
        도형을 불러오는 중
      </div>
    );
  }

  const features = viewModel.layers.flatMap((layer) =>
    layer.features.map((feature) => ({
      ...feature,
      layerName: layer.name,
    })),
  );

  if (features.length === 0) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-sm font-bold text-slate-500">
        표시할 도형 없음
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      {features.map((feature) => (
        <LayerFeatureSummaryRow
          feature={feature}
          key={feature.id}
          onSelectFeature={onSelectFeature}
          onToggleFeatureVisibility={onToggleFeatureVisibility}
        />
      ))}
    </div>
  );
}
