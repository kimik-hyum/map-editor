import { Lock } from "lucide-react";
import { useScrollIntoViewWhenSelected } from "../hooks/useScrollIntoViewWhenSelected";
import type { FeatureStackRowViewModel } from "../model/layerPanelModel";
import { LayerVisibilityIcon } from "./LayerVisibilityIcon";

type FeatureStackRowProps = {
  row: FeatureStackRowViewModel;
  onToggleVisibility: (row: FeatureStackRowViewModel) => void;
  onSelect: (row: FeatureStackRowViewModel) => void;
};

// 평탄 스택(1레이어 = 1도형)의 행 하나. 선택 하이라이트·패널 스크롤 추적·표시 토글을 담당합니다.
export function FeatureStackRow({
  row,
  onToggleVisibility,
  onSelect,
}: FeatureStackRowProps) {
  // 지도에서 선택돼도 패널이 해당 행으로 따라가도록 스크롤한다.
  const rowRef = useScrollIntoViewWhenSelected<HTMLLIElement>(row.isSelected);

  return (
    <li
      className={
        row.isSelected
          ? "flex min-w-0 items-center gap-2 rounded-md bg-indigo-50 px-2 py-1.5 ring-1 ring-inset ring-indigo-300"
          : "flex min-w-0 items-center gap-2 rounded-md bg-slate-50 px-2 py-1.5"
      }
      ref={rowRef}
    >
      <LayerVisibilityIcon
        disabled={false}
        isDimmed={row.isDimmed}
        isVisible={row.isVisible}
        onToggle={() => onToggleVisibility(row)}
        subject="도형"
      />
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: row.accentColor }}
      />
      {/* 행 본문 클릭 = 도형 선택(다시 클릭하면 해제). 지도 하이라이트와 같은 선택 상태를 공유한다. */}
      <button
        aria-label={`${row.name} 선택`}
        aria-pressed={row.isSelected}
        className="min-w-0 flex-1 cursor-pointer border-0 bg-transparent p-0 text-left"
        onClick={() => onSelect(row)}
        type="button"
      >
        <span className="block truncate text-sm font-black leading-5 text-slate-950">
          {row.name}
        </span>
        <span className="flex gap-1.5 text-[11px] font-bold text-slate-500">
          <span>{row.geometryKindLabel}</span>
          {row.isSelected ? (
            <span className="font-extrabold text-indigo-600">선택</span>
          ) : null}
        </span>
      </button>
      <span className="flex shrink-0 items-center gap-1">
        {/* 잠금 = 읽기 전용·참고용. 토글은 후속(#64), 지금은 표시만. */}
        {row.isLocked ? (
          <Lock aria-label="잠긴 도형" className="h-3.5 w-3.5 text-slate-400" />
        ) : null}
        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-black text-slate-500">
          {row.orderLabel}
        </span>
      </span>
    </li>
  );
}
