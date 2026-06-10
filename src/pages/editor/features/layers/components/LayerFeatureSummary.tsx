import { useScrollIntoViewWhenSelected } from "../hooks/useScrollIntoViewWhenSelected";
import type {
  LayerFeatureListItemViewModel,
  LayerPanelViewModel,
} from "../model/layerPanelModel";
import { LayerVisibilityIcon } from "./LayerVisibilityIcon";

type LayerFeatureSummaryProps = {
  viewModel: LayerPanelViewModel;
  onToggleFeatureVisibility: (feature: LayerFeatureListItemViewModel) => void;
  onSelectFeature: (feature: LayerFeatureListItemViewModel) => void;
};

type SummaryRowProps = {
  feature: LayerFeatureListItemViewModel & { layerName: string };
  onToggleFeatureVisibility: (feature: LayerFeatureListItemViewModel) => void;
  onSelectFeature: (feature: LayerFeatureListItemViewModel) => void;
};

function SummaryRow({
  feature,
  onToggleFeatureVisibility,
  onSelectFeature,
}: SummaryRowProps) {
  // 지도에서 선택돼도 도형 탭이 해당 카드로 따라가도록 스크롤한다.
  const rowRef = useScrollIntoViewWhenSelected<HTMLElement>(feature.isSelected);

  return (
    <article
      className={
        feature.isSelected
          ? "flex min-w-0 items-start gap-2 rounded-lg border border-indigo-300 bg-indigo-50 p-2.5 shadow-sm"
          : "flex min-w-0 items-start gap-2 rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm"
      }
      ref={rowRef}
    >
      <LayerVisibilityIcon
        disabled={feature.isToggleDisabled}
        isDimmed={false}
        isVisible={feature.isVisible}
        onToggle={() => onToggleFeatureVisibility(feature)}
        subject="도형"
      />
      <span
        className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: feature.accentColor }}
      />
      {/* 본문 클릭 = 도형 선택(다시 클릭하면 해제). 레이어 탭·지도와 같은 선택 상태를 공유한다. */}
      <button
        aria-label={`${feature.name} 선택`}
        aria-pressed={feature.isSelected}
        className="min-w-0 flex-1 cursor-pointer border-0 bg-transparent p-0 text-left"
        onClick={() => onSelectFeature(feature)}
        type="button"
      >
        <h3 className="m-0 truncate text-sm font-black text-slate-950">
          {feature.name}
        </h3>
        <p className="m-0 mt-0.5 truncate text-[11px] font-bold text-slate-500">
          {feature.layerName} · {feature.geometryKindLabel}
          {feature.isSelected ? " · 선택" : ""}
        </p>
      </button>
    </article>
  );
}

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
        <SummaryRow
          feature={feature}
          key={feature.id}
          onSelectFeature={onSelectFeature}
          onToggleFeatureVisibility={onToggleFeatureVisibility}
        />
      ))}
    </div>
  );
}
