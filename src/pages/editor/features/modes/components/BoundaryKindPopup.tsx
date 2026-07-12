import type { RefObject } from "react";
import {
  type RegionBoundaryStatus,
  useRegionKinds,
} from "@/pages/editor/features/regions";
import { useEditorStore } from "@/pages/editor/state/editorStore";
import {
  createBoundaryKindOptions,
  fallbackBoundaryKindOptions,
} from "../model/boundaryKindModel";
import { ToolOptionPopup } from "./ToolOptionPopup";

type BoundaryKindPopupProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  anchor: RefObject<HTMLButtonElement | null>;
  boundaryStatus: RegionBoundaryStatus;
  operationError: string | null;
};

// 경계 종류 선택과 현재 화면의 조회·연산 상태를 사이드메뉴 한곳에서 보여줍니다.
// 병합·더하기·빼기 실행은 지도 위 경계 칩이 담당합니다.
export function BoundaryKindPopup({
  open,
  onOpenChange,
  anchor,
  boundaryStatus,
  operationError,
}: BoundaryKindPopupProps) {
  const activeBoundaryKind = useEditorStore((state) => state.activeBoundaryKind);
  const setActiveBoundaryKind = useEditorStore((state) => state.setActiveBoundaryKind);
  const { data: kinds, isError, isLoading } = useRegionKinds();
  const usingFallback = !kinds && isError;
  const options = kinds
    ? createBoundaryKindOptions(kinds)
    : usingFallback
      ? fallbackBoundaryKindOptions
      : [];
  const returnedLabel =
    kinds?.find((kind) => kind.kind === boundaryStatus.kind)?.label ??
    fallbackBoundaryKindOptions.find((option) => option.id === boundaryStatus.kind)
      ?.label ??
    boundaryStatus.kind ??
    "-";
  const statusError = boundaryStatus.error ?? operationError;

  return (
    <ToolOptionPopup
      activeId={activeBoundaryKind ?? ""}
      anchor={anchor}
      onOpenChange={onOpenChange}
      onSelect={setActiveBoundaryKind}
      open={open}
      options={options}
      title="경계 종류"
      footer={
        <div className="grid gap-2">
          <div aria-live="polite" className="text-[11px] font-semibold text-slate-500">
            {activeBoundaryKind === null ? (
              <span>경계 종류를 선택하면 화면에 표시됩니다.</span>
            ) : boundaryStatus.loading ? (
              <span>경계 불러오는 중…</span>
            ) : statusError ? (
              <span className="text-red-600">{statusError}</span>
            ) : (
              <span>
                현재 화면: <b className="text-slate-700">{returnedLabel}</b> ·{" "}
                {boundaryStatus.count}개
                {boundaryStatus.kind && boundaryStatus.kind !== activeBoundaryKind ? (
                  <span className="text-slate-400"> (줌 아웃 → 상위 구역)</span>
                ) : null}
                {boundaryStatus.truncated ? (
                  <span className="text-amber-600">
                    {" "}
                    · 일부만 표시됨 — 지도를 확대하세요
                  </span>
                ) : null}
              </span>
            )}
          </div>
          {activeBoundaryKind !== null ? (
            <button
              className="justify-self-start rounded-md px-2 py-1 text-[11px] font-bold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
              onClick={() => setActiveBoundaryKind(null)}
              type="button"
            >
              경계 숨기기
            </button>
          ) : null}
        </div>
      }
      notice={
        isLoading
          ? "종류 불러오는 중…"
          : isError
            ? usingFallback
              ? "종류를 불러오지 못해 기본 종류를 표시합니다."
              : "종류를 갱신하지 못해 기존 목록을 표시합니다."
            : undefined
      }
    />
  );
}
