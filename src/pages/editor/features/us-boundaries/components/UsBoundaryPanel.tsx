import { FloatingPanel } from "@/pages/editor/components/FloatingPanel";
import type { useUsBoundaryPreview } from "../hooks/useUsBoundaryPreview";
import { usKindLabels, usKindSchema } from "../model/usBoundaryModel";

type Props = { preview: ReturnType<typeof useUsBoundaryPreview>; blocked: boolean };

export function UsBoundaryPanel({ preview, blocked }: Props) {
  const buttonClass =
    "rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50";
  return (
    <FloatingPanel
      title="미국 경계"
      onClose={preview.close}
      defaultPosition={{ x: Math.max(24, window.innerWidth - 88 - 364), y: 64 }}
      defaultSize={{ width: 340, height: 420 }}
      minHeight={360}
    >
      <div className="grid gap-4 text-sm">
        <p className="m-0 text-xs leading-5 text-slate-600">
          미국 지역을 선택하거나 지도를 움직여 참고 경계를 확인하세요.
        </p>
        <label className="grid gap-1.5 text-xs font-bold text-slate-700">
          경계 종류
          <select
            aria-label="미국 경계 종류"
            value={preview.kind}
            disabled={blocked}
            onChange={(event) =>
              preview.setKind(usKindSchema.parse(event.target.value))
            }
            className="w-full rounded-md border border-slate-300 bg-white p-2 text-sm"
          >
            {Object.entries(usKindLabels).map(([kind, label]) => (
              <option key={kind} value={kind}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={buttonClass}
            disabled={blocked}
            onClick={() => preview.moveTo("new-york")}
          >
            뉴욕
          </button>
          <button
            type="button"
            className={buttonClass}
            disabled={blocked}
            onClick={() => preview.moveTo("san-francisco")}
          >
            샌프란시스코
          </button>
          <button
            type="button"
            className={buttonClass}
            disabled={blocked}
            onClick={() => preview.moveTo("continental-us")}
          >
            미국 본토
          </button>
        </div>
        <button
          type="button"
          disabled={blocked || preview.loading}
          onClick={preview.load}
          className="rounded-md bg-teal-700 px-3 py-2.5 text-sm font-extrabold text-white hover:bg-teal-800 disabled:opacity-50"
        >
          현재 화면 불러오기
        </button>
        <p
          className="m-0 text-xs font-bold text-teal-800"
          role="status"
          aria-live="polite"
        >
          {preview.loading
            ? "미국 경계 불러오는 중…"
            : preview.hasResult
              ? `${usKindLabels[preview.kind]} ${preview.count}개 표시`
              : "경계 종류와 조회할 지역을 선택해주세요."}
        </p>
        {preview.error ? (
          <div className="text-xs text-red-700" role="alert">
            {preview.error}
            <button
              type="button"
              className="mt-2 block underline"
              disabled={blocked || preview.loading}
              onClick={preview.retry}
            >
              다시 시도
            </button>
          </div>
        ) : null}
        {preview.hasResult && preview.moved ? (
          <p className="m-0 text-xs text-slate-500">
            이동한 지역은 ‘현재 화면 불러오기’로 갱신할 수 있습니다.
          </p>
        ) : null}
        <p className="m-0 border-t border-slate-200 pt-3 text-[11px] leading-5 text-slate-500">
          U.S. Census Bureau · 2026 TIGER/Line
          <br />
          우편번호 통계구역은 2020 Census 기준이며 실제 배송구역과 다를 수 있습니다.
        </p>
      </div>
    </FloatingPanel>
  );
}
