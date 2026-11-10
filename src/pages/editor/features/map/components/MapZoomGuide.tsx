import { useId } from "react";
import { useT } from "@/shared/i18n/useT";
import { cn } from "@/shared/utils/cn";
import { isBoundaryZoomRangeActive } from "../model/boundaryZoomGuide";
import type { useBoundaryZoomGuide } from "../hooks/useBoundaryZoomGuide";

export function MapZoomGuide({
  guide,
  zoom,
  onZoomChange,
}: {
  guide: ReturnType<typeof useBoundaryZoomGuide>;
  zoom: number;
  onZoomChange: (zoom: number) => void;
}) {
  const t = useT();
  const titleId = useId();
  return (
    <section
      aria-labelledby={titleId}
      className="w-48 rounded-xl border border-line bg-white/95 p-3 shadow-lg backdrop-blur-sm"
    >
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <h2 id={titleId} className="text-xs font-extrabold text-ink">
          {t("경계 표시 단계")}
        </h2>
        <span className="rounded bg-surface px-1.5 py-0.5 text-[10px] font-bold text-ink-muted">
          {guide.country}
        </span>
      </div>
      <div className="grid gap-1">
        {[...guide.ranges].reverse().map((range) => {
          const current = isBoundaryZoomRangeActive(range, zoom);
          const targetZoom = current
            ? Math.floor(zoom)
            : range.maxZoom < zoom
              ? range.maxZoom
              : range.minZoom;
          return (
            <button
              key={`${range.kind}-${range.minZoom}`}
              type="button"
              aria-label={t("{{kind}} 표시 단계로 이동: 줌 {{zoom}}", {
                kind: t(range.label),
                zoom: targetZoom,
              })}
              aria-current={current ? "step" : undefined}
              onClick={() => onZoomChange(targetZoom)}
              className={cn(
                "flex min-h-10 items-center gap-2 rounded-lg border px-2 py-1.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                current
                  ? "border-brand-line bg-brand-soft text-brand-strong"
                  : "border-transparent text-ink-soft hover:bg-surface",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "h-1.5 w-1.5 shrink-0 rounded-full",
                  current ? "bg-brand" : "bg-line",
                )}
              />
              <span className="min-w-0 flex-1 text-xs font-bold">{t(range.label)}</span>
              <span className="shrink-0 font-mono text-[10px] tabular-nums">
                Z{range.minZoom}–{range.maxZoom}
              </span>
            </button>
          );
        })}
      </div>
      {guide.estimated && (
        <p className="mt-2 text-[10px] leading-relaxed text-ink-muted">
          {t("기본 기준 · 연결 후 서버 설정이 적용됩니다.")}
        </p>
      )}
      {guide.country === "US" && (
        <p className="mt-2 text-[10px] leading-relaxed text-ink-muted">
          {t("미국 경계는 줌과 관계없이 선택한 종류를 유지합니다.")}
        </p>
      )}
      <p
        role="status"
        className="mt-2.5 border-t border-line pt-2.5 text-[11px] leading-relaxed text-ink-soft"
      >
        {guide.message}
      </p>
    </section>
  );
}
