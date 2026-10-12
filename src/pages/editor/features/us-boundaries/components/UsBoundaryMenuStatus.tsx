import type { useUsBoundaryPreview } from "../hooks/useUsBoundaryPreview";
import { usKindLabels } from "../model/usBoundaryModel";

export function UsBoundaryMenuStatus({
  preview,
  onSelectKind,
}: {
  preview: ReturnType<typeof useUsBoundaryPreview>;
  onSelectKind: (kind: string) => void;
}) {
  const buttonClass =
    "rounded-md border border-slate-200 px-2 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-50";
  return (
    <div className="grid gap-2.5">
      <div className="flex flex-wrap gap-1.5">
        <button
          className={buttonClass}
          disabled={!preview.kind}
          type="button"
          onClick={() => preview.moveTo("new-york")}
        >
          뉴욕
        </button>
        <button
          className={buttonClass}
          disabled={!preview.kind}
          type="button"
          onClick={() => preview.moveTo("san-francisco")}
        >
          샌프란시스코
        </button>
        <button
          className={buttonClass}
          disabled={!preview.kind}
          type="button"
          onClick={() => {
            preview.moveTo("continental-us");
            onSelectKind("state");
          }}
        >
          미국 본토
        </button>
      </div>
      <button
        type="button"
        disabled={!preview.kind || preview.loading}
        onClick={preview.load}
        className="rounded-md bg-teal-700 px-3 py-2 text-xs font-bold text-white hover:bg-teal-800 disabled:opacity-50"
      >
        현재 화면 불러오기
      </button>
      <p
        role="status"
        aria-live="polite"
        className="m-0 text-[11px] font-semibold text-teal-800"
      >
        {preview.loading
          ? "미국 경계 불러오는 중…"
          : preview.hasResult && preview.kind
            ? `${usKindLabels[preview.kind]} ${preview.count}개 표시`
            : "경계 종류를 선택하면 화면에 표시됩니다."}
      </p>
      {preview.error ? (
        <div role="alert" className="text-[11px] text-red-700">
          {preview.error}
          <button
            type="button"
            onClick={preview.retry}
            className="mt-1 block underline"
          >
            다시 시도
          </button>
        </div>
      ) : null}
      {preview.hasResult && preview.moved ? (
        <p className="m-0 text-[11px] text-slate-500">
          이동한 지역은 현재 화면 불러오기로 갱신하세요.
        </p>
      ) : null}
      <p className="m-0 text-[10px] leading-4 text-slate-400">
        U.S. Census Bureau · 2026 TIGER/Line
        <br />
        우편번호 통계구역: 2020 Census 기준
      </p>
    </div>
  );
}
