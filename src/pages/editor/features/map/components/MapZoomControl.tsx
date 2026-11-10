import { Layers2, Minus, Plus } from "lucide-react";
import { useId, useState } from "react";
import { useT } from "@/shared/i18n/useT";
import type { useMapZoom } from "../hooks/useMapZoom";
import type { useBoundaryZoomGuide } from "../hooks/useBoundaryZoomGuide";
import { MapZoomGuide } from "./MapZoomGuide";

export function MapZoomControl({
  control,
  guide,
}: {
  control: ReturnType<typeof useMapZoom>;
  guide: ReturnType<typeof useBoundaryZoomGuide>;
}) {
  const t = useT();
  const [guideOpen, setGuideOpen] = useState(true);
  const guideId = useId();
  if (!control.state) return null;
  const { zoom, minZoom, maxZoom } = control.state;
  const level = Math.floor((zoom + 1e-8) * 10) / 10;
  const buttonClass =
    "flex h-8 w-9 items-center justify-center rounded-md text-ink-soft hover:bg-brand-soft hover:text-brand disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";
  return (
    <div className="absolute bottom-9 left-3 z-20 flex items-end gap-2">
      <section
        aria-label={t("지도 줌 조절")}
        className="flex w-12 shrink-0 flex-col items-center rounded-xl border border-line bg-white py-1.5 shadow-lg"
      >
        <button
          type="button"
          aria-label={t("지도 확대")}
          title={t("지도 확대")}
          disabled={zoom >= maxZoom - 1e-8}
          onClick={() => control.stepZoom(1)}
          className={buttonClass}
        >
          <Plus aria-hidden className="h-4 w-4" />
        </button>
        <output
          aria-label={t("현재 줌 단계")}
          className="my-1 rounded bg-brand-soft px-1 py-0.5 font-mono text-[10px] font-bold text-brand tabular-nums"
        >
          Z{level}
        </output>
        <div className="relative my-1 h-[min(26vh,208px)] min-h-20 w-9">
          <div aria-hidden className="pointer-events-none absolute inset-x-2 inset-y-2">
            {Array.from(
              { length: Math.floor(maxZoom) - Math.ceil(minZoom) + 1 },
              (_, index) => {
                const tick = Math.ceil(minZoom) + index;
                return (
                  <span
                    key={tick}
                    className="absolute left-0 h-px w-full bg-line"
                    style={{
                      bottom: `${((tick - minZoom) / (maxZoom - minZoom || 1)) * 100}%`,
                    }}
                  />
                );
              },
            )}
          </div>
          <input
            type="range"
            aria-label={t("줌 단계")}
            aria-orientation="vertical"
            aria-valuetext={t("줌 {{zoom}}", { zoom: level })}
            min={minZoom}
            max={maxZoom}
            step="any"
            value={zoom}
            onChange={(event) => control.setZoom(Number(event.target.value))}
            onKeyDown={(event) => {
              if (
                [
                  "ArrowUp",
                  "ArrowRight",
                  "ArrowDown",
                  "ArrowLeft",
                  "Home",
                  "End",
                ].includes(event.key)
              ) {
                event.preventDefault();
                if (event.key === "Home") control.setZoom(minZoom);
                else if (event.key === "End") control.setZoom(maxZoom);
                else
                  control.stepZoom(
                    event.key === "ArrowUp" || event.key === "ArrowRight" ? 1 : -1,
                  );
              }
            }}
            className="editor-zoom-range absolute inset-0 h-full w-full cursor-pointer"
          />
        </div>
        <button
          type="button"
          aria-label={t("지도 축소")}
          title={t("지도 축소")}
          disabled={zoom <= minZoom + 1e-8}
          onClick={() => control.stepZoom(-1)}
          className={buttonClass}
        >
          <Minus aria-hidden className="h-4 w-4" />
        </button>
        <div className="mt-1 border-t border-line pt-1">
          <button
            type="button"
            aria-label={t("경계 표시 단계 안내")}
            title={t("경계 표시 단계 안내")}
            aria-expanded={guideOpen}
            aria-controls={guideId}
            onClick={() => setGuideOpen(!guideOpen)}
            className={buttonClass}
          >
            <Layers2 aria-hidden className="h-3.5 w-3.5" />
          </button>
        </div>
      </section>
      <div id={guideId} hidden={!guideOpen}>
        <MapZoomGuide guide={guide} zoom={zoom} onZoomChange={control.setZoom} />
      </div>
    </div>
  );
}
