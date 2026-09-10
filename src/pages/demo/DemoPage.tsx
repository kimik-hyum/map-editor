import { lazy, Suspense, useEffect } from "react";
import {
  Callout,
  DocsArticle,
  DocsButton,
  DocsCodeBlock,
  DocsHero,
  DocsSection,
} from "@/pages/docs/components";
import { useEditorHost, type EditorHostStatus } from "./host/useEditorHost";

// 문서 페이지를 읽을 때는 부모 지도용 OpenLayers 코드까지 불러오지 않습니다.
const DemoSceneMap = lazy(() =>
  import("./DemoSceneMap").then((module) => ({ default: module.DemoSceneMap })),
);

const statusLabels: Record<EditorHostStatus, string> = {
  idle: "대기 중",
  opening: "에디터 여는 중 · READY 신호 대기",
  connected: "연결됨 · scene 전달 완료",
  submitted: "완료됨 · 편집 결과 수신",
  cancelled: "취소됨 · 반환 데이터 없음",
  closed: "에디터 창이 닫힘 · 부모 데이터 유지",
  error: "오류",
};

export function DemoPage() {
  const { scene, status, errorMessage, submittedScene, openEditor } = useEditorHost();
  useEffect(() => {
    document.title = "부모 지도 데모 | Maps Editor";
  }, []);

  return (
    <DocsArticle>
      <DocsHero
        eyebrow="Host Demo"
        id="host-overview"
        title="부모 지도에서 편집하기"
        description="현재 지도 데이터를 새 창에서 편집해 보세요. 저장하면 편집 창이 닫히고 이 지도에 반영됩니다. 다시 열면 방금 저장한 내용으로 이어서 편집합니다."
      />

      <DocsSection id="launch-editor">
        <div className="mb-4 flex flex-wrap items-center gap-4">
          <DocsButton onClick={openEditor}>편집기 새 창으로 열기</DocsButton>
          <span aria-live="polite" className="text-sm font-bold text-ink-soft">
            상태: {statusLabels[status]}
          </span>
        </div>
        {errorMessage ? (
          <Callout className="mb-4" tone="error">
            {errorMessage}
          </Callout>
        ) : null}
        <Suspense
          fallback={
            <div className="flex h-[420px] items-center justify-center rounded-xl border border-line text-sm text-ink-soft max-[560px]:h-[320px]">
              부모 지도를 불러오는 중…
            </div>
          }
        >
          <DemoSceneMap scene={scene} />
        </Suspense>
        <p className="mb-0 mt-3 text-sm leading-6 text-ink-soft">
          지도에서 이동·확대할 수 있습니다. 도형 수정은 편집기에서 진행하며, 취소하거나
          창만 닫으면 부모 데이터는 유지됩니다.
        </p>
      </DocsSection>

      <DocsSection id="current-data" title="현재 부모 데이터">
        <p className="mb-4 mt-0 text-sm leading-6 text-ink-soft">
          아래 데이터가 지도와 다음 편집의 기준입니다. 이 데모는 서버에 저장하지 않으며,
          페이지를 새로고침하면 최초 샘플로 돌아갑니다.
        </p>
        <details className="min-w-0 rounded-lg border border-line bg-white p-4">
          <summary className="cursor-pointer text-sm font-bold text-ink">
            현재 scene JSON 보기
          </summary>
          <DocsCodeBlock
            className="mt-4"
            code={JSON.stringify(scene, null, 2)}
            language="json"
            title="current-scene.json"
          />
        </details>
        <span data-testid="parent-scene" hidden>
          {JSON.stringify(scene)}
        </span>
        {submittedScene ? (
          <span data-testid="submitted-scene" hidden>
            {JSON.stringify(submittedScene)}
          </span>
        ) : null}
        <div className="mt-6">
          <DocsButton to="/integration" variant="secondary">
            부모 창 연동 문서
          </DocsButton>
        </div>
      </DocsSection>
    </DocsArticle>
  );
}
