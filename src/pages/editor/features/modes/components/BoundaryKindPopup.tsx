import type { RefObject } from "react";
import { useBoundaryAccess } from "@/features/auth";
import type { RegionBoundaryStatus } from "@/pages/editor/features/regions";
import {
  UsBoundaryMenuStatus,
  type useUsBoundaryPreview,
} from "@/pages/editor/features/us-boundaries";
import { useEditorStore } from "@/pages/editor/state/editorStore";
import type { BoundaryCountryCode } from "@/shared/config/boundaryCountries";
import { useBoundaryKindOptions } from "../hooks/useBoundaryKindOptions";
import { BoundaryCountrySelect } from "./BoundaryCountrySelect";
import { ToolOptionPopup } from "./ToolOptionPopup";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  anchor: RefObject<HTMLButtonElement | null>;
  boundaryStatus: RegionBoundaryStatus;
  operationError: string | null;
  onSearchOpen: () => void;
  onSelectKind: (kind: string) => void;
  onCountryChange: (country: BoundaryCountryCode) => void;
  usPreview: ReturnType<typeof useUsBoundaryPreview>;
  busy: boolean;
};

export function BoundaryKindPopup({
  open,
  onOpenChange,
  anchor,
  boundaryStatus,
  operationError,
  onSearchOpen,
  onSelectKind,
  onCountryChange,
  usPreview,
  busy,
}: Props) {
  const country = useEditorStore((state) => state.activeBoundaryCountry);
  const activeKind = useEditorStore((state) => state.activeBoundaryKind);
  const hide = useEditorStore((state) => state.setActiveBoundaryKind);
  const { allowed } = useBoundaryAccess();
  const { options, data: kinds, isError, isLoading } = useBoundaryKindOptions(country);
  const label =
    kinds?.find((kind) => kind.kind === boundaryStatus.kind)?.label ??
    options.find((option) => option.id === boundaryStatus.kind)?.label ??
    boundaryStatus.kind ??
    "-";
  const error = boundaryStatus.error ?? operationError;
  return (
    <ToolOptionPopup
      activeId={activeKind ?? ""}
      anchor={anchor}
      open={open}
      onOpenChange={onOpenChange}
      onSelect={onSelectKind}
      options={options}
      title="경계 종류"
      className="w-64"
      header={
        <BoundaryCountrySelect
          value={country}
          onChange={onCountryChange}
          disabled={busy}
        />
      }
      notice={
        country === "KR" && allowed
          ? isLoading
            ? "종류 불러오는 중…"
            : isError
              ? kinds
                ? "종류를 갱신하지 못해 기존 목록을 표시합니다."
                : "종류를 불러오지 못해 기본 종류를 표시합니다."
              : undefined
          : undefined
      }
      footer={
        <div className="grid gap-2">
          {country === "US" ? (
            <UsBoundaryMenuStatus preview={usPreview} onSelectKind={onSelectKind} />
          ) : !allowed ? (
            <div className="grid gap-2 py-1">
              <p className="m-0 text-[11px] leading-5 text-slate-500">
                한국 경계 데이터는 Google 로그인 후 사용할 수 있습니다.
              </p>
              <button
                type="button"
                onClick={() => onSelectKind(activeKind ?? "adminDong")}
                className="rounded-md bg-teal-700 px-3 py-2 text-xs font-bold text-white hover:bg-teal-800"
              >
                한국 경계 불러오기
              </button>
            </div>
          ) : (
            <>
              {activeKind ? (
                <button
                  type="button"
                  className="justify-self-start rounded-md px-2 py-1 text-[11px] font-bold text-teal-700 hover:bg-teal-50"
                  onClick={() => {
                    onSearchOpen();
                    onOpenChange(false);
                  }}
                >
                  경계 검색 열기
                </button>
              ) : null}
              <div
                aria-live="polite"
                className="text-[11px] font-semibold text-slate-500"
              >
                {activeKind === null ? (
                  <span>경계 종류를 선택하면 화면에 표시됩니다.</span>
                ) : (
                  <span>
                    현재 화면: <b className="text-slate-700">{label}</b> ·{" "}
                    {boundaryStatus.count}개
                    {boundaryStatus.kind && boundaryStatus.kind !== activeKind ? (
                      <span className="text-slate-400"> (줌 아웃 → 상위 구역)</span>
                    ) : null}
                    {boundaryStatus.truncated ? (
                      <span className="text-amber-600">
                        {" "}
                        · 일부만 표시됨 — 지도를 확대하세요
                      </span>
                    ) : null}
                    {boundaryStatus.loading ? (
                      <span className="block">
                        경계 불러오는 중…
                        {boundaryStatus.totalRequests > 1
                          ? ` ${boundaryStatus.completedRequests}/${boundaryStatus.totalRequests}개 구역`
                          : ""}
                      </span>
                    ) : null}
                  </span>
                )}
                {activeKind !== null && error ? (
                  <span className="block text-red-600" role="alert">
                    {error}
                  </span>
                ) : null}
              </div>
              {activeKind !== null &&
              boundaryStatus.failedRequests > 0 &&
              !boundaryStatus.loading ? (
                <button
                  className="justify-self-start rounded-md px-2 py-1 text-[11px] font-bold text-ink hover:bg-slate-100"
                  onClick={boundaryStatus.retryFailed}
                  type="button"
                >
                  실패 구역 다시 불러오기
                </button>
              ) : null}
            </>
          )}
          {activeKind !== null ? (
            <button
              className="justify-self-start rounded-md px-2 py-1 text-[11px] font-bold text-slate-500 hover:bg-slate-100"
              disabled={busy}
              onClick={() => hide(null)}
              type="button"
            >
              경계 숨기기
            </button>
          ) : null}
        </div>
      }
    />
  );
}
