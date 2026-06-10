import type { LayerFeatureListItemViewModel } from "../model/layerPanelModel";
import { LayerVisibilityIcon } from "./LayerVisibilityIcon";

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
        <li
          className={
            feature.isSelected
              ? "flex min-w-0 items-start gap-2 rounded-md bg-indigo-50 px-2 py-1.5 ring-1 ring-indigo-300"
              : "flex min-w-0 items-start gap-2 rounded-md bg-slate-50 px-2 py-1.5"
          }
          key={feature.id}
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
          {/* 행 본문 클릭 = 도형 선택(다시 클릭하면 해제). 지도 하이라이트와 같은 선택 상태를 공유한다. */}
          <button
            aria-label={`${feature.name} 선택`}
            aria-pressed={feature.isSelected}
            className="min-w-0 flex-1 cursor-pointer border-0 bg-transparent p-0 text-left"
            onClick={() => onSelectFeature(feature)}
            type="button"
          >
            <span className="block truncate text-sm font-black leading-5 text-slate-950">
              {feature.name}
            </span>
            <span className="flex gap-1.5 text-[11px] font-bold text-slate-500">
              <span>{feature.geometryKindLabel}</span>
              {feature.isSelected ? (
                <span className="font-extrabold text-indigo-600">선택</span>
              ) : null}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
