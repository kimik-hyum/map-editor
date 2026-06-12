import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, ChevronUp, GripVertical, Lock, LockOpen } from "lucide-react";
import { useScrollIntoViewWhenSelected } from "../hooks/useScrollIntoViewWhenSelected";
import type { FeatureStackRowViewModel } from "../model/layerPanelModel";
import { LayerVisibilityIcon } from "./LayerVisibilityIcon";

type FeatureStackRowProps = {
  row: FeatureStackRowViewModel;
  onToggleVisibility: (row: FeatureStackRowViewModel) => void;
  onToggleLock: (row: FeatureStackRowViewModel) => void;
  onSelect: (row: FeatureStackRowViewModel) => void;
  onMove: (row: FeatureStackRowViewModel, direction: "up" | "down") => void;
};

// 평탄 스택(1레이어 = 1도형)의 행 하나. 선택 하이라이트·스크롤 추적·표시/잠금 토글·순서 이동을 담당합니다.
// 구역: 왼쪽 = 상태 토글(표시·잠금), 가운데 = 선택, 오른쪽 = 순서(▲▼는 호버·선택 시, 끌기 핸들은 상시).
// 드래그 재정렬은 오른쪽 끝 끌기 핸들(⠿)에서만 시작됩니다.
export function FeatureStackRow({
  row,
  onToggleVisibility,
  onToggleLock,
  onSelect,
  onMove,
}: FeatureStackRowProps) {
  // 지도에서 선택돼도 패널이 해당 행으로 따라가도록 스크롤한다.
  const rowRef = useScrollIntoViewWhenSelected<HTMLLIElement>(row.isSelected);
  const { setNodeRef, transform, transition, isDragging, listeners } = useSortable({
    id: row.id,
  });

  const setRefs = (element: HTMLLIElement | null) => {
    rowRef.current = element;
    setNodeRef(element);
  };

  // 세로 목록이므로 가로 이동은 0으로 고정한다(가로 스크롤·빈 공간으로 끌리는 현상 방지).
  const verticalOnlyTransform = transform
    ? CSS.Transform.toString({ ...transform, x: 0 })
    : undefined;

  // 순서 화살표(▲▼)는 행에 마우스를 올리거나 행이 선택됐을 때만 나타난다(패널 밀도 유지).
  const showOrderControls = row.isSelected;

  return (
    <li
      className={`group flex min-w-0 select-none items-center gap-2 rounded-md px-2 py-1.5 ${
        row.isSelected
          ? "bg-indigo-50 ring-1 ring-inset ring-indigo-300"
          : "bg-slate-50"
      } ${isDragging ? "z-10 opacity-70 shadow-md" : ""}`}
      ref={setRefs}
      style={{ transform: verticalOnlyTransform, transition }}
    >
      <LayerVisibilityIcon
        disabled={false}
        isDimmed={row.isDimmed}
        isVisible={row.isVisible}
        onToggle={() => onToggleVisibility(row)}
        subject="도형"
      />
      {/* 잠금 토글: 잠금 = 읽기 전용·참고용(선택은 가능, 이동·정점편집 불가). */}
      <button
        aria-label={row.isLocked ? `${row.name} 잠금 해제` : `${row.name} 잠금`}
        aria-pressed={row.isLocked}
        className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded border-0 bg-transparent p-0"
        onClick={() => onToggleLock(row)}
        title={row.isLocked ? "잠금 해제" : "잠금"}
        type="button"
      >
        {row.isLocked ? (
          <Lock aria-hidden className="h-3.5 w-3.5 text-slate-600" />
        ) : (
          <LockOpen
            aria-hidden
            className="h-3.5 w-3.5 text-slate-300 transition-colors hover:text-slate-500"
          />
        )}
      </button>
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
      {/* 오른쪽 순서 구역: ▲▼는 호버/선택 시에만, 끌기 핸들(⠿)은 상시. 드래그는 핸들에서만 시작된다. */}
      <span className="flex h-7 shrink-0 items-center justify-end">
        <span
          className={`${
            showOrderControls ? "flex" : "hidden group-hover:flex"
          } items-center`}
        >
          <button
            aria-label={`${row.name} 위로 이동`}
            className="flex h-6 w-6 cursor-pointer items-center justify-center rounded border-0 bg-transparent p-0 text-slate-500 hover:text-slate-900 disabled:cursor-default disabled:opacity-30"
            disabled={!row.canMoveUp}
            onClick={() => onMove(row, "up")}
            title="위로 이동"
            type="button"
          >
            <ChevronUp aria-hidden className="h-4 w-4" />
          </button>
          <button
            aria-label={`${row.name} 아래로 이동`}
            className="flex h-6 w-6 cursor-pointer items-center justify-center rounded border-0 bg-transparent p-0 text-slate-500 hover:text-slate-900 disabled:cursor-default disabled:opacity-30"
            disabled={!row.canMoveDown}
            onClick={() => onMove(row, "down")}
            title="아래로 이동"
            type="button"
          >
            <ChevronDown aria-hidden className="h-4 w-4" />
          </button>
        </span>
        {/* 끌기 핸들: 여기서만 드래그가 시작된다(터치 스크롤 간섭도 핸들로 한정). */}
        <button
          aria-label={`${row.name} 끌어서 순서 변경`}
          className="flex h-7 w-6 shrink-0 cursor-grab touch-none items-center justify-center border-0 bg-transparent p-0 text-slate-300 hover:text-slate-500 active:cursor-grabbing"
          title="끌어서 순서 변경"
          type="button"
          {...listeners}
        >
          <GripVertical aria-hidden className="h-4 w-4" />
        </button>
      </span>
    </li>
  );
}
