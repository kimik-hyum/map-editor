import { useT } from "@/shared/i18n/useT";
import { useState } from "react";
import { LocalizedLink as Link } from "@/shared/i18n/LocalizedLink";
import { editorTourSteps } from "../content/editorTour";
import { cn } from "@/shared/utils/cn";

export function DocsEditorTour() {
  const t = useT();
  const [activeIndex, setActiveIndex] = useState(0);
  const step = editorTourSteps[activeIndex];
  const source = `/docs/${step.image}`;
  return (
    <figure
      className="@container m-0 overflow-hidden rounded-2xl border border-line bg-white"
      aria-label={t("실제 편집 화면 도구 안내")}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-slate-50 px-4 py-3 text-xs text-ink-soft">
        <strong>{t("편집 창 안내 · 도구를 선택하면 화면과 설명이 바뀝니다")}</strong>
        <a
          href={source}
          target="_blank"
          rel="noreferrer"
          className="font-bold text-brand"
        >
          {t("원본 크기로 보기 ↗")}
        </a>
      </div>
      <div className="grid min-w-0 @min-[720px]:grid-cols-[200px_minmax(0,1fr)]">
        <div className="min-w-0 border-b border-line bg-slate-50 @min-[720px]:border-b-0 @min-[720px]:border-r">
          <p className="m-0 px-4 pt-4 text-xs font-bold text-ink-soft">
            {t("도구 선택")}
          </p>
          <fieldset
            className="m-0 flex min-w-0 flex-wrap gap-2 border-0 p-3 @min-[720px]:flex-col @min-[720px]:flex-nowrap"
            aria-label={t("강조할 도구 선택")}
          >
            {editorTourSteps.map((item, index) => (
              <button
                type="button"
                key={item.id}
                aria-pressed={index === activeIndex}
                aria-controls="editor-tour-preview editor-tour-explanation"
                onClick={() => setActiveIndex(index)}
                className={cn(
                  "rounded-lg border px-3 py-2.5 text-left text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                  index === activeIndex
                    ? "border-teal-600 bg-teal-700 text-white"
                    : "border-transparent text-ink-soft hover:border-brand-line hover:bg-teal-50",
                )}
              >
                {index + 1}. {t(item.label)}
              </button>
            ))}
          </fieldset>
        </div>
        <div className="min-w-0">
          <div
            id="editor-tour-preview"
            className="relative overflow-hidden bg-slate-100"
          >
            <img
              src={source}
              alt={
                step.id === "draw"
                  ? t(
                      "경복궁 사각형을 표시한 편집 창에서 폴리곤·패스·마커 선택 팝업을 연 모습",
                    )
                  : t(
                      "경복궁 사각형을 선택하고 수동으로 확대한 편집 창. 왼쪽 도구와 레이어 목록, 하단 완료 버튼",
                    )
              }
              width={1440}
              height={900}
              className="block h-auto w-full"
            />
            <div
              data-testid="editor-tour-highlight"
              aria-hidden="true"
              className="pointer-events-none absolute rounded border-[3px] border-teal-400 motion-safe:transition-all motion-safe:duration-200"
              style={{
                left: `${step.bounds.x}%`,
                top: `${step.bounds.y}%`,
                width: `${step.bounds.width}%`,
                height: `${step.bounds.height}%`,
                boxShadow: "0 0 0 9999px rgb(15 23 42 / 0.28)",
              }}
            />
          </div>
          <div
            id="editor-tour-explanation"
            className="border-t border-line bg-teal-50 p-4"
            aria-live="polite"
          >
            <p className="m-0 text-xs font-bold text-brand">
              {activeIndex + 1} / {editorTourSteps.length} · {t(step.label)}
            </p>
            <h3 className="mb-0 mt-2 text-base font-bold text-brand-strong">
              {t(step.title)}
            </h3>
            <p className="mb-0 mt-2 text-sm leading-6 text-ink-soft">
              {t(step.description)}
            </p>
            <p className="mb-0 mt-3 text-sm font-bold text-brand-strong">
              {t(step.action)}
            </p>
          </div>
        </div>
      </div>
      <figcaption className="border-t border-line px-4 py-3 text-xs leading-5 text-ink-soft">
        {t("화면 캡처 위의 위치 안내이며 이 이미지에서 도형을 편집하지는 않습니다.")}{" "}
        <Link to="/integration#quickstart" className="font-bold text-brand">
          {t("새 창 실습에서 직접 편집하기 →")}
        </Link>
        <br />
        {t("지도 ©")}{" "}
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noreferrer"
        >
          OpenStreetMap contributors
        </a>
        {t(". 경복궁 예제를 수동으로 확대한 화면입니다.")}
      </figcaption>
    </figure>
  );
}
