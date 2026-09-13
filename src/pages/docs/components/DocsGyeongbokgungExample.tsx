import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { ExternalLink, RotateCcw } from "lucide-react";
import { inputScene } from "../content/examples/input-scene.example";
import inputSceneExplanation from "../content/examples/input-scene.example.jsonc?raw";
import type { EditorSceneInput } from "../content/examples/editor-contract.example";
import { createMapEditorHost } from "../content/examples/map-editor-host.example";
import { DocsCodeBlock } from "./DocsCodeBlock";

const DocsExampleMap = lazy(() =>
  import("./DocsExampleMap").then((module) => ({ default: module.DocsExampleMap })),
);

export function DocsGyeongbokgungExample() {
  const [scene, setScene] = useState<EditorSceneInput>(() =>
    structuredClone(inputScene),
  );
  const sceneRef = useRef(scene);
  const [status, setStatus] = useState("폴리곤·선·마커가 각각 1개씩 준비되었습니다.");
  const [saved, setSaved] = useState(false);
  const hostRef = useRef<ReturnType<typeof createMapEditorHost> | null>(null);
  useEffect(() => {
    const host = createMapEditorHost({
      editorUrl: new URL("/editor/", window.location.href).href,
      getScene: () => sceneRef.current,
      onSubmit(next) {
        sceneRef.current = next;
        setScene(next);
        setSaved(true);
        setStatus("저장 결과를 받았습니다. 아래 지도와 JSON에 반영했습니다.");
      },
      onCancel() {
        setStatus("취소했습니다. 기존 권역을 유지합니다.");
      },
      onError: setStatus,
    });
    hostRef.current = host;
    return () => {
      hostRef.current = null;
      host.dispose();
    };
  }, []);
  const open = () => {
    try {
      hostRef.current?.open();
      setStatus(
        "편집 창을 열었습니다. 권역·경로·마커를 선택해 편집한 뒤 ‘저장하고 편집 완료’를 눌러보세요.",
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "편집 창을 열 수 없습니다.");
    }
  };
  const reset = () => {
    const next = structuredClone(inputScene);
    sceneRef.current = next;
    setScene(next);
    setSaved(false);
    setStatus(
      "이 페이지의 폴리곤·선·마커를 처음 상태로 되돌렸습니다. 이미 열린 편집 창의 데이터는 유지됩니다.",
    );
  };
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-teal-50/60 p-4">
        <div>
          <strong className="block text-sm text-ink">내 서비스의 지도</strong>
          <span className="text-xs text-ink-soft">
            경복궁 권역·경로·위치 마커 · 편집 결과를 이곳에 반영합니다
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-bold text-white hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            type="button"
            onClick={open}
          >
            <ExternalLink size={16} aria-hidden />
            경복궁 예제 새 창으로 편집
          </button>
          <button
            className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink-soft"
            type="button"
            onClick={reset}
          >
            <RotateCcw size={14} aria-hidden />
            초기화
          </button>
        </div>
      </div>
      <Suspense
        fallback={
          <div className="flex h-[300px] items-center justify-center bg-slate-50 text-sm text-ink-soft">
            경복궁 예제 지도를 불러오는 중…
          </div>
        }
      >
        <DocsExampleMap scene={scene} />
      </Suspense>
      <div className="border-t border-line p-4">
        <p className="m-0 text-sm font-bold text-brand-strong" role="status">
          {status}
        </p>
        <p className="mb-0 mt-2 text-xs leading-5 text-ink-soft">
          사각형은 권역, 선은 예제 경로, 마커는 경로의 시작 위치입니다. 실제 지적·행정
          경계나 공식 관람 동선은 아닙니다. 처음 열린 편집 창에서 경복궁 주변을 확대해
          보세요. 이 예제는 서버에 저장하지 않으며 새로고침하면 초기화됩니다.
        </p>
        <details className="mt-3" open={saved || undefined}>
          <summary className="cursor-pointer text-sm font-bold text-ink">
            {saved ? "방금 돌려받은 scene JSON" : "새 창에 보낼 scene JSON"}
          </summary>
          {!saved && (
            <p className="mb-0 mt-3 text-xs leading-5 text-ink-soft">
              각 필드의 목적을 주석으로 적은 JSONC 예제입니다. ‘JSON 복사’를 누르면 주석
              없는 실제 데이터를 복사합니다. 새 창에는 이 데이터를 INIT 메시지의 scene
              객체로 보냅니다.
            </p>
          )}
          <DocsCodeBlock
            className="mt-3"
            code={saved ? JSON.stringify(scene, null, 2) : inputSceneExplanation}
            copyText={JSON.stringify(scene, null, 2)}
            copyLabel="JSON 복사"
            language={saved ? "json" : "javascript"}
            title={saved ? "수신한 결과.json" : "현재 입력.jsonc · 필드 설명"}
          />
        </details>
        <span data-testid="palace-scene" hidden>
          {JSON.stringify(scene)}
        </span>
      </div>
    </div>
  );
}
