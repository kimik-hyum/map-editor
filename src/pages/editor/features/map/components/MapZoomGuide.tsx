import { useId } from "react";
import { useT } from "@/shared/i18n/useT";
import { cn } from "@/shared/utils/cn";
import { isBoundaryZoomRangeActive } from "../model/boundaryZoomGuide";
import type { useBoundaryZoomGuide } from "../hooks/useBoundaryZoomGuide";

export function MapZoomGuide({
  guide,
  zoom,
  minZoom,
  maxZoom,
  onZoomChange,
}: {
  guide: ReturnType<typeof useBoundaryZoomGuide>;
  zoom: number;
  minZoom: number;
  maxZoom: number;
  onZoomChange: (zoom: number) => void;
}) {
  const t = useT();
  const titleId = useId();
  const transition = guide.transitionZoom;
  const anchorZoom = Math.max(minZoom, Math.min(maxZoom, transition ?? zoom));
  const top = ((maxZoom - anchorZoom) / (maxZoom - minZoom || 1)) * 100;
  const split = guide.ranges.length > 1;
  return (
    <section aria-labelledby={titleId} className="relative h-full">
      <h2 id={titleId} className="sr-only">
        {t("경계 표시 단계")}
      </h2>
      {guide.ranges.length === 0 ? (
        <span
          className="editor-zoom-label absolute left-0 top-1/2 -translate-y-1/2 whitespace-nowrap text-[10px] text-ink-muted"
          title={guide.message}
        >
          {t("경계 줌 기준 미확인")}
        </span>
      ) : (
        <div className="absolute left-0 w-44" style={{ top: `${top}%` }}>
          {/* 화살표 끝은 전환 줌 눈금에 고정하고, 두 종류의 글자만 위/아래로 나눕니다. */}
          <svg
            aria-hidden="true"
            data-testid="boundary-zoom-anchor"
            data-zoom={anchorZoom}
            className="editor-zoom-arrow pointer-events-none absolute -top-6 left-0 h-12 w-4 text-ink-soft"
            viewBox="0 0 16 48"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.25"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M1 24H5M1 24L4 21M1 24L4 27" />
            <path d={split ? "M5 24L10 12H16M5 24L10 36H16" : "M5 24H16"} />
          </svg>
          {[...guide.ranges].reverse().map((range) => {
            const current = guide.displayedKind
              ? range.kind === guide.displayedKind
              : isBoundaryZoomRangeActive(range, zoom);
            const below = transition !== null && range.maxZoom < transition;
            const targetZoom =
              transition === null
                ? zoom
                : Math.max(
                    minZoom,
                    Math.min(maxZoom, below ? transition - 1 : transition),
                  );
            const zoomRange =
              transition === null
                ? t("모든 줌")
                : below
                  ? `Z<${transition}`
                  : `Z≥${transition}`;
            const description = [
              `${t(range.label)} · ${zoomRange}`,
              guide.country === "US"
                ? t("미국 경계는 줌과 관계없이 선택한 종류를 유지합니다.")
                : null,
              guide.message,
            ]
              .filter(Boolean)
              .join("\n");
            return (
              <button
                key={`${range.kind}-${range.minZoom}`}
                type="button"
                aria-label={t("{{kind}} 표시 단계로 이동: 줌 {{zoom}}", {
                  kind: t(range.label),
                  zoom: targetZoom,
                })}
                aria-current={current ? "step" : undefined}
                title={description}
                onClick={() => onZoomChange(targetZoom)}
                style={{ top: split ? (below ? 0 : -24) : -12 }}
                className={cn(
                  "editor-zoom-label pointer-events-auto absolute left-4 flex h-6 max-w-40 items-center gap-1 whitespace-nowrap rounded-sm text-left text-[11px] hover:text-brand-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                  current ? "font-bold text-brand-strong" : "font-medium text-ink-soft",
                )}
              >
                <span className="min-w-0 truncate">{t(range.label)}</span>
                <span className="shrink-0 font-mono text-[9px] tabular-nums">
                  {zoomRange}
                </span>
              </button>
            );
          })}
        </div>
      )}
      <p role="status" className="sr-only">
        {guide.message}
      </p>
    </section>
  );
}
