import { useState } from "react";
import { Link } from "react-router";
import { editorTourSteps } from "../content/editorTour";
import { cn } from "@/shared/utils/cn";

export function DocsEditorTour() {
  const [activeIndex, setActiveIndex] = useState(0);
  const step = editorTourSteps[activeIndex];
  const source = `/docs/${step.image}`;
  return (
    <figure
      className="m-0 overflow-hidden rounded-2xl border border-line bg-white"
      aria-label="실제 편집 화면 도구 안내"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-slate-50 px-4 py-3 text-xs text-ink-soft">
        <strong>실제 에디터 화면 · 도구를 선택하면 위치가 강조됩니다</strong>
        <a
          href={source}
          target="_blank"
          rel="noreferrer"
          className="font-bold text-brand"
        >
          원본 크기로 보기 ↗
        </a>
      </div>
      <div className="relative overflow-hidden bg-slate-100">
        <img
          src={source}
          alt={
            step.id === "draw"
              ? "경복궁 사각형을 표시한 에디터에서 폴리곤·패스·마커 선택 팝업을 연 모습"
              : "경복궁 사각형을 선택하고 수동으로 확대한 실제 에디터. 왼쪽 도구와 레이어 목록, 하단 완료 버튼"
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
      <fieldset
        className="m-0 flex min-w-0 flex-wrap gap-2 border-0 border-t border-line p-4"
        aria-label="강조할 도구 선택"
      >
        {editorTourSteps.map((item, index) => (
          <button
            type="button"
            key={item.id}
            aria-pressed={index === activeIndex}
            aria-controls="editor-tour-explanation"
            onClick={() => setActiveIndex(index)}
            className={cn(
              "rounded-lg border px-3 py-2 text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
              index === activeIndex
                ? "border-teal-600 bg-teal-700 text-white"
                : "border-line text-ink-soft hover:bg-teal-50",
            )}
          >
            {index + 1}. {item.label}
          </button>
        ))}
      </fieldset>
      <div
        id="editor-tour-explanation"
        className="mx-4 mb-4 rounded-xl bg-teal-50 p-4"
        aria-live="polite"
      >
        <h3 className="m-0 text-base font-bold text-brand-strong">{step.title}</h3>
        <p className="mb-0 mt-2 text-sm leading-6 text-ink-soft">{step.description}</p>
        <p className="mb-0 mt-3 text-sm font-bold text-brand-strong">{step.action}</p>
      </div>
      <figcaption className="border-t border-line px-4 py-3 text-xs leading-5 text-ink-soft">
        화면 캡처 위의 위치 안내이며 이 이미지에서 도형을 편집하지는 않습니다.{" "}
        <Link to="/integration#quickstart" className="font-bold text-brand">
          새 창 실습에서 직접 편집하기 →
        </Link>
        <br />
        지도 ©{" "}
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noreferrer"
        >
          OpenStreetMap contributors
        </a>
        . 경복궁 예제를 수동으로 확대한 화면입니다.
      </figcaption>
    </figure>
  );
}
