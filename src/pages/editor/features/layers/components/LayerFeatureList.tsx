import type { LayerFeatureListItemViewModel } from "../model/layerPanelModel";
import { LayerFeatureRow } from "./LayerFeatureRow";

type LayerFeatureListProps = {
  features: LayerFeatureListItemViewModel[];
  onToggleFeatureVisibility: (feature: LayerFeatureListItemViewModel) => void;
  onSelectFeature: (feature: LayerFeatureListItemViewModel) => void;
};

export function LayerFeatureList({
  features,
  onToggleFeatureVisibility,
  onSelectFeature,
}: LayerFeatureListProps) {
  if (features.length === 0) {
    return <p className="m-0 text-xs font-semibold text-slate-400">도형 없음</p>;
  }

  return (
    <ul className="m-0 grid list-none gap-1.5 p-0">
      {features.map((feature) => (
        <LayerFeatureRow
          feature={feature}
          key={feature.id}
          onSelectFeature={onSelectFeature}
          onToggleFeatureVisibility={onToggleFeatureVisibility}
        />
      ))}
    </ul>
  );
}
