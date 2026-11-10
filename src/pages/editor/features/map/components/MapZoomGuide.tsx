import { useId } from "react";
import { ArrowLeft } from "lucide-react";
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
  return (
    <section aria-labelledby={titleId} className="relative h-full">
      <h2 id={titleId} className="sr-only">
        {t("경계 표시 단계")}
      </h2>
      {[...guide.ranges].reverse().map((range) => {
        const current = isBoundaryZoomRangeActive(range, zoom);
        const targetZoom = current
          ? Math.floor(zoom)
          : range.maxZoom < zoom
            ? range.maxZoom
            : range.minZoom;
        // 각 표시 구간의 가운데에 붙여, 인접한 전환 단계의 글자가 겹치지 않게 합니다.
        const midpoint = (Math.max(minZoom, range.minZoom) + range.maxZoom) / 2;
        const top = Math.max(
          0,
          Math.min(100, ((maxZoom - midpoint) / (maxZoom - minZoom || 1)) * 100),
        );
        const zoomRange = `Z${range.minZoom}–${range.maxZoom}`;
        const description = [
          `${t(range.label)} · ${zoomRange}`,
          guide.estimated ? t("기본 기준 · 연결 후 서버 설정이 적용됩니다.") : null,
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
            style={{ top: `${top}%` }}
            className={cn(
              "editor-zoom-label pointer-events-auto absolute left-0 flex h-6 max-w-44 -translate-y-1/2 items-center gap-1 whitespace-nowrap rounded-sm text-left text-[11px] hover:text-brand-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
              current ? "font-bold text-brand-strong" : "font-medium text-ink-soft",
            )}
          >
            <ArrowLeft aria-hidden className="h-3 w-3 shrink-0" strokeWidth={1.5} />
            <span className="min-w-0 truncate">{t(range.label)}</span>
            <span className="shrink-0 font-mono text-[9px] tabular-nums">
              {zoomRange}
            </span>
          </button>
        );
      })}
      <p role="status" className="sr-only">
        {guide.message}
      </p>
    </section>
  );
}
