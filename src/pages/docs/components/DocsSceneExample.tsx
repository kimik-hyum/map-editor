import { useT } from "@/shared/i18n/useT";
import { lazy, Suspense, useContext } from "react";
import { LocaleContext } from "@/shared/i18n/localeContext";
import { useEditorHost, type EditorHostStatus } from "@/pages/demo/host/useEditorHost";
import { getDocsExample, getDocsScene } from "../content/localizedExamples";
import { ExternalLink, RotateCcw } from "lucide-react";
import { DocsCodeBlock } from "./DocsCodeBlock";

const DocsExampleMap = lazy(() =>
  import("./DocsExampleMap").then((module) => ({ default: module.DocsExampleMap })),
);

const statusLabels: Record<EditorHostStatus, string> = {
  idle: "폴리곤·선·마커가 각각 1개씩 준비되었습니다.",
  opening:
    "편집 창을 열었습니다. 권역·경로·마커를 선택해 편집한 뒤 ‘저장하고 편집 완료’를 눌러보세요.",
  connected:
    "편집 창을 열었습니다. 권역·경로·마커를 선택해 편집한 뒤 ‘저장하고 편집 완료’를 눌러보세요.",
  submitted: "편집 결과를 받았습니다. 아래 지도와 JSON에 반영했습니다.",
  cancelled: "취소했습니다. 기존 편집 데이터를 유지합니다.",
  closed: "에디터 탭이 닫힘 · 서비스 데이터 유지",
  error: "오류",
};

export function DocsSceneExample() {
  const t = useT();
  const locale = useContext(LocaleContext) ?? "ko";
  const {
    scene,
    status,
    errorMessage,
    hasEdits: saved,
    openEditor: open,
    resetScene: reset,
  } = useEditorHost(getDocsScene);
  const inputSceneExplanation = getDocsExample(locale).explanation;
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-teal-50/60 p-4">
        <div>
          <strong className="block text-sm text-ink">
            {t("서비스 페이지의 예제 지도")}
          </strong>
          <span className="text-xs text-ink-soft">
            {t("경복궁 권역·경로·위치 마커 · 편집 결과를 이곳에 반영합니다")}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-bold text-white hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            type="button"
            onClick={open}
          >
            <ExternalLink size={16} aria-hidden />
            {t("경복궁 예제 새 창으로 편집")}
          </button>
          <button
            className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink-soft"
            type="button"
            onClick={reset}
          >
            <RotateCcw size={14} aria-hidden />
            {t("초기화")}
          </button>
        </div>
      </div>
      <Suspense
        fallback={
          <div className="flex h-[300px] items-center justify-center bg-slate-50 text-sm text-ink-soft">
            {t("경복궁 예제 지도를 불러오는 중…")}
          </div>
        }
      >
        <DocsExampleMap scene={scene} />
      </Suspense>
      <div className="border-t border-line p-4">
        <p className="m-0 text-sm font-bold text-brand-strong" role="status">
          {t(errorMessage ?? statusLabels[status])}
        </p>
        <p className="mb-0 mt-2 text-xs leading-5 text-ink-soft">
          {t(
            "사각형은 권역, 선은 예제 경로, 마커는 경로의 시작 위치입니다. 실제 지적·행정 경계나 공식 관람 동선은 아닙니다. 처음 열린 편집 창에서 경복궁 주변을 확대해 보세요. 이 예제는 서버에 저장하지 않으며 새로고침하면 초기화됩니다.",
          )}
        </p>
        <details className="mt-3" open={saved || undefined}>
          <summary className="cursor-pointer text-sm font-bold text-ink">
            {saved ? t("돌려받은 편집 결과 JSON") : t("편집 창에 보낼 데이터 JSON")}
          </summary>
          {!saved && (
            <p className="mb-0 mt-3 text-xs leading-5 text-ink-soft">
              {t(
                "각 필드의 목적을 주석으로 적은 JSONC 예제입니다. ‘JSON 복사’를 누르면 주석 없는 실제 데이터를 복사합니다. 편집 창에는 이 데이터를 INIT 메시지의 scene 객체로 보냅니다.",
              )}
            </p>
          )}
          <DocsCodeBlock
            translateExample={!saved}
            className="mt-3"
            code={saved ? JSON.stringify(scene, null, 2) : inputSceneExplanation}
            copyText={JSON.stringify(scene, null, 2)}
            copyLabel={t("JSON 복사")}
            language={saved ? "json" : "javascript"}
            title={saved ? t("수신한 결과.json") : t("현재 입력.jsonc · 필드 설명")}
          />
        </details>
        <span data-testid="example-scene" hidden>
          {JSON.stringify(scene)}
        </span>
      </div>
    </div>
  );
}
