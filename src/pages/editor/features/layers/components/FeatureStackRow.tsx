import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Check, GripVertical, Lock, LockOpen, Pencil, Trash2, X } from "lucide-react";
import { type FormEvent, useEffect, useId, useRef, useState } from "react";
import { isToggleSelectionModifier } from "@/pages/editor/features/selection";
import {
  getFeatureNameValidationError,
  MAX_FEATURE_NAME_LENGTH,
  normalizeFeatureName,
} from "@/pages/editor/types/editorTypes";
import { useScrollIntoViewWhenSelected } from "../hooks/useScrollIntoViewWhenSelected";
import type { FeatureStackRowViewModel } from "../model/layerPanelModel";
import { LayerVisibilityIcon } from "./LayerVisibilityIcon";

type FeatureStackRowProps = {
  row: FeatureStackRowViewModel;
  onToggleVisibility: (row: FeatureStackRowViewModel) => void;
  onToggleLock: (row: FeatureStackRowViewModel) => void;
  onSelect: (row: FeatureStackRowViewModel, additive: boolean) => void;
  onDelete: (row: FeatureStackRowViewModel) => Promise<void>;
  onRename: (row: FeatureStackRowViewModel, name: string) => void;
  onStartRename: (row: FeatureStackRowViewModel) => void;
  onCancelRename: () => void;
  isRenaming: boolean;
};

// 평탄 스택(1레이어 = 1도형)의 행 하나. 선택 하이라이트·스크롤 추적·표시/잠금 토글·순서 이동을 담당합니다.
// 구역: 왼쪽 = 상태 토글(표시·잠금), 가운데 = 선택, 오른쪽 = 끌기 핸들(⠿).
// 순서 변경은 핸들 드래그로 한다(핸들에 포커스를 두고 스페이스 후 방향키로도 이동 가능).
export function FeatureStackRow({
  row,
  onToggleVisibility,
  onToggleLock,
  onSelect,
  onDelete,
  onRename,
  onStartRename,
  onCancelRename,
  isRenaming,
}: FeatureStackRowProps) {
  const [renameDraft, setRenameDraft] = useState<string | null>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const renameButtonRef = useRef<HTMLButtonElement>(null);
  const restoreFocusAfterRenameRef = useRef(false);
  const renameHelpId = useId();
  // 지도에서 선택돼도 패널이 해당 행으로 따라가도록 스크롤한다.
  const rowRef = useScrollIntoViewWhenSelected<HTMLLIElement>(row.isSelected);
  const {
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
    listeners,
    attributes,
  } = useSortable({ id: row.id });

  const setRefs = (element: HTMLLIElement | null) => {
    rowRef.current = element;
    setNodeRef(element);
  };
  const normalizedName =
    renameDraft === null ? null : normalizeFeatureName(renameDraft);
  const renameError =
    renameDraft === null ? null : getFeatureNameValidationError(renameDraft);
  const canSaveRename = normalizedName !== null && normalizedName !== row.name;
  useEffect(() => {
    if (isRenaming) {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
      return;
    }

    if (restoreFocusAfterRenameRef.current) {
      restoreFocusAfterRenameRef.current = false;
      renameButtonRef.current?.focus();
    }
  }, [isRenaming]);

  const closeRename = () => {
    restoreFocusAfterRenameRef.current = true;
    setRenameDraft(null);
    onCancelRename();
  };

  const submitRename = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSaveRename || normalizedName === null) {
      return;
    }
    onRename(row, normalizedName);
    closeRename();
  };

  return (
    <li
      className={`group flex min-w-0 select-none items-center gap-2 rounded-md px-2 py-1.5 ${
        row.isSelected
          ? "bg-indigo-50 ring-1 ring-inset ring-indigo-300"
          : "bg-slate-50"
      } ${isDragging ? "z-10 opacity-70 shadow-md" : ""}`}
      ref={setRefs}
      style={{ transform: CSS.Transform.toString(transform), transition }}
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
      {isRenaming ? (
        <form className="grid min-w-0 flex-1 gap-0.5" onSubmit={submitRename}>
          <span className="flex min-w-0 items-center gap-1">
            <input
              aria-describedby={renameHelpId}
              aria-invalid={renameError !== null}
              aria-label={`${row.name} 새 이름`}
              className="min-w-0 flex-1 rounded-md border border-teal-500 bg-white px-2 py-1 text-sm font-bold text-slate-950 outline-none ring-2 ring-teal-100"
              maxLength={MAX_FEATURE_NAME_LENGTH}
              onChange={(event) => setRenameDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  closeRename();
                }
              }}
              ref={renameInputRef}
              value={renameDraft ?? ""}
            />
            <button
              aria-label="이름 변경 저장"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-teal-700 transition-colors hover:bg-teal-50 disabled:cursor-not-allowed disabled:text-slate-300"
              disabled={!canSaveRename}
              title="저장"
              type="submit"
            >
              <Check aria-hidden className="h-3.5 w-3.5" />
            </button>
            <button
              aria-label="이름 변경 취소"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              onClick={closeRename}
              title="취소"
              type="button"
            >
              <X aria-hidden className="h-3.5 w-3.5" />
            </button>
          </span>
          <span
            aria-live="polite"
            className={`flex min-w-0 items-center justify-between gap-2 px-0.5 text-[10px] font-bold ${
              renameError ? "text-rose-600" : "text-slate-400"
            }`}
            id={renameHelpId}
          >
            <span className="truncate">
              {renameError ?? `1–${MAX_FEATURE_NAME_LENGTH}자 · 앞뒤 공백 제외`}
            </span>
            <span className="shrink-0">
              {renameDraft?.trim().length ?? 0}/{MAX_FEATURE_NAME_LENGTH}
            </span>
          </span>
        </form>
      ) : (
        <>
          {/* 행 본문 클릭 = 도형 선택(다시 클릭하면 해제). 지도 하이라이트와 같은 선택 상태를 공유한다. */}
          <button
            aria-label={`${row.name} 선택`}
            aria-pressed={row.isSelected}
            className="min-w-0 flex-1 cursor-pointer border-0 bg-transparent p-0 text-left"
            onClick={(event) => onSelect(row, isToggleSelectionModifier(event))}
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
          {row.canRename ? (
            <button
              aria-label={`${row.name} 이름 변경`}
              className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded border-0 bg-transparent p-0 text-slate-300 transition-colors hover:bg-teal-50 hover:text-teal-700"
              onClick={() => {
                setRenameDraft(row.name);
                onStartRename(row);
              }}
              ref={renameButtonRef}
              title="이름 변경"
              type="button"
            >
              <Pencil aria-hidden className="h-3.5 w-3.5" />
            </button>
          ) : null}
          {row.canDelete ? (
            <button
              aria-label={`${row.name} 삭제`}
              className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded border-0 bg-transparent p-0 text-slate-300 transition-colors hover:bg-rose-50 hover:text-rose-600"
              onClick={() => void onDelete(row)}
              title="레이어 삭제"
              type="button"
            >
              <Trash2 aria-hidden className="h-3.5 w-3.5" />
            </button>
          ) : null}
          {/* 끌기 핸들: 여기서만 드래그가 시작된다(터치 스크롤 간섭도 핸들로 한정).
          키보드 이동(스페이스 후 방향키)이 동작하려면 활성자 ref와 속성을 함께 붙여야 한다. */}
          <button
            aria-label={`${row.name} 끌어서 순서 변경`}
            className="flex h-7 w-6 shrink-0 cursor-grab touch-none items-center justify-center border-0 bg-transparent p-0 text-slate-300 hover:text-slate-500 active:cursor-grabbing"
            ref={setActivatorNodeRef}
            title="끌어서 순서 변경"
            type="button"
            {...attributes}
            {...listeners}
          >
            <GripVertical aria-hidden className="h-4 w-4" />
          </button>
        </>
      )}
    </li>
  );
}
