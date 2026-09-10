import type { EditorSceneInput } from "@/pages/editor/types/editorTypes";
import { useDemoMap } from "./map/useDemoMap";
import "ol/ol.css";

type DemoSceneMapProps = { scene: EditorSceneInput };

export function DemoSceneMap({ scene }: DemoSceneMapProps) {
  const mapRef = useDemoMap(scene);
  const visibleCount = scene.features.filter(
    (feature) => feature.visible !== false,
  ).length;
  return (
    <section
      aria-label="부모 지도 미리보기"
      className="overflow-hidden rounded-xl border border-line bg-white"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3 text-sm">
        <h2 className="m-0 font-bold text-ink">부모 지도</h2>
        <span aria-live="polite" className="text-ink-soft">
          전체 {scene.features.length}개 · 표시 {visibleCount}개 · 숨김{" "}
          {scene.features.length - visibleCount}개
        </span>
      </div>
      <div className="relative">
        <div
          aria-label="부모 지도"
          role="application"
          // biome-ignore lint/a11y/noNoninteractiveTabindex: OpenLayers의 키보드 이동·확대 입력을 받는 지도입니다.
          tabIndex={0}
          ref={mapRef}
          className="h-[420px] w-full bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand max-[560px]:h-[320px]"
        />
        {visibleCount === 0 ? (
          <p className="pointer-events-none absolute inset-x-4 top-4 m-0 rounded-lg bg-white/95 p-3 text-center text-sm text-ink-soft">
            표시할 도형이 없습니다. 편집기에서 도형을 추가하거나 표시 상태를 바꾸세요.
          </p>
        ) : null}
      </div>
    </section>
  );
}
