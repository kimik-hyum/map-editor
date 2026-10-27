import { useT } from "@/shared/i18n/useT";
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
import { ToolOptionsSection } from "./ToolOptionsSection";

type Props = {
  boundaryStatus: RegionBoundaryStatus;
  operationError: string | null;
  onSearchOpen: () => void;
  onSelectKind: (kind: string) => void;
  onCountryChange: (country: BoundaryCountryCode) => void;
  usPreview: ReturnType<typeof useUsBoundaryPreview>;
  busy: boolean;
};

export function BoundaryOptions({
  boundaryStatus,
  operationError,
  onSearchOpen,
  onSelectKind,
  onCountryChange,
  usPreview,
  busy,
}: Props) {
  const t = useT();
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
  const error = boundaryStatus.error;
  return (
    <ToolOptionsSection
      activeId={activeKind ?? ""}
      onSelect={onSelectKind}
      options={country === "KR" && !allowed ? [] : options}
      title={t("경계 데이터")}
      header={
        <>
          <BoundaryCountrySelect
            value={country}
            onChange={onCountryChange}
            disabled={busy}
          />
          {country === "KR" && !allowed ? (
            <div className="mt-3 grid gap-3 rounded-lg border border-teal-100 bg-teal-50/60 p-3">
              <p className="m-0 text-[11px] leading-5 text-slate-500">
                {t(
                  "대한민국 경계를 사용하려면 Google 계정으로 로그인하세요. 미국 경계는 로그인 없이 사용할 수 있습니다.",
                )}
              </p>
              <button
                type="button"
                onClick={() => onSelectKind(activeKind ?? "adminDong")}
                className="rounded-md bg-teal-700 px-3 py-2 text-xs font-bold text-white hover:bg-teal-800"
              >
                {t("Google로 로그인")}
              </button>
            </div>
          ) : null}
        </>
      }
      notice={
        country === "KR" && allowed
          ? isLoading
            ? t("종류 불러오는 중…")
            : isError
              ? kinds
                ? t("종류를 갱신하지 못해 기존 목록을 표시합니다.")
                : t("종류를 불러오지 못해 기본 종류를 표시합니다.")
              : undefined
          : undefined
      }
      footer={
        <div className="grid gap-2">
          {country === "US" ? (
            <UsBoundaryMenuStatus preview={usPreview} onSelectKind={onSelectKind} />
          ) : !allowed ? null : (
            <>
              {activeKind ? (
                <button
                  type="button"
                  className="justify-self-start rounded-md px-2 py-1 text-[11px] font-bold text-teal-700 hover:bg-teal-50"
                  onClick={() => {
                    onSearchOpen();
                  }}
                >
                  {t("경계 검색 열기")}
                </button>
              ) : null}
              <div
                aria-live="polite"
                className="text-[11px] font-semibold text-slate-500"
              >
                {activeKind === null ? (
                  <span>{t("경계 종류를 선택하면 화면에 표시됩니다.")}</span>
                ) : (
                  <span>
                    {t("현재 화면:")} <b className="text-slate-700">{t(label)}</b> ·{" "}
                    {boundaryStatus.count}
                    {t("개")}
                    {boundaryStatus.kind && boundaryStatus.kind !== activeKind ? (
                      <span className="text-slate-400">
                        {" "}
                        {t("(줌 아웃 → 상위 구역)")}
                      </span>
                    ) : null}
                    {boundaryStatus.truncated ? (
                      <span className="text-amber-600">
                        {" "}
                        {t("· 일부만 표시됨 — 지도를 확대하세요")}
                      </span>
                    ) : null}
                    {boundaryStatus.loading ? (
                      <span className="block">
                        {t("경계 불러오는 중…")}
                        {boundaryStatus.totalRequests > 1
                          ? t(" {{v0}}/{{v1}}개 구역", {
                              v0: boundaryStatus.completedRequests,
                              v1: boundaryStatus.totalRequests,
                            })
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
                  {t("실패 구역 다시 불러오기")}
                </button>
              ) : null}
            </>
          )}
          {activeKind !== null && operationError ? (
            <p role="alert" className="m-0 text-[11px] text-red-600">
              {operationError}
            </p>
          ) : null}
          {activeKind !== null ? (
            <button
              className="justify-self-start rounded-md px-2 py-1 text-[11px] font-bold text-slate-500 hover:bg-slate-100"
              disabled={busy}
              onClick={() => hide(null)}
              type="button"
            >
              {t("경계 숨기기")}
            </button>
          ) : null}
        </div>
      }
    />
  );
}
