import { useScrollIntoViewWhenSelected } from "../hooks/useScrollIntoViewWhenSelected";
import type { LayerFeatureListItemViewModel } from "../model/layerPanelModel";
import { LayerVisibilityIcon } from "./LayerVisibilityIcon";

type LayerFeatureSummaryRowProps = {
  feature: LayerFeatureListItemViewModel & { layerName: string };
  onToggleFeatureVisibility: (feature: LayerFeatureListItemViewModel) => void;
  onSelectFeature: (feature: LayerFeatureListItemViewModel) => void;
};

// 도형 탭 카드 하나. 선택 시 카드 하이라이트와 패널 스크롤 추적을 담당합니다.
export function LayerFeatureSummaryRow({
  feature,
  onToggleFeatureVisibility,
  onSelectFeature,
}: LayerFeatureSummaryRowProps) {
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
