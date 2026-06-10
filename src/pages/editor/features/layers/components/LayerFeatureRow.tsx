import { useScrollIntoViewWhenSelected } from "../hooks/useScrollIntoViewWhenSelected";
import type { LayerFeatureListItemViewModel } from "../model/layerPanelModel";
import { LayerVisibilityIcon } from "./LayerVisibilityIcon";

type LayerFeatureRowProps = {
  feature: LayerFeatureListItemViewModel;
  onToggleFeatureVisibility: (feature: LayerFeatureListItemViewModel) => void;
  onSelectFeature: (feature: LayerFeatureListItemViewModel) => void;
};

// 레이어 탭 도형 목록의 행 하나. 선택 시 행 하이라이트와 패널 스크롤 추적을 담당합니다.
export function LayerFeatureRow({
  feature,
  onToggleFeatureVisibility,
  onSelectFeature,
}: LayerFeatureRowProps) {
  // 지도에서 선택돼도 패널이 해당 행으로 따라가도록 스크롤한다.
  const rowRef = useScrollIntoViewWhenSelected<HTMLLIElement>(feature.isSelected);

  return (
    <li
      className={
        feature.isSelected
          ? "flex min-w-0 items-start gap-2 rounded-md bg-indigo-50 px-2 py-1.5 ring-1 ring-indigo-300"
          : "flex min-w-0 items-start gap-2 rounded-md bg-slate-50 px-2 py-1.5"
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
  );
}
