import { Link } from "react-router";
import { useEditorHost, type EditorHostStatus } from "./host/useEditorHost";

const statusLabels: Record<EditorHostStatus, string> = {
  idle: "대기 중",
  opening: "에디터 여는 중 · READY 신호 대기",
  connected: "연결됨 · scene 전달 완료",
  submitted: "완료됨 · 편집 결과 수신",
  cancelled: "취소됨 · 반환 데이터 없음",
  closed: "에디터 창이 닫힘",
  error: "오류",
};

export function DemoPage() {
  const { status, errorMessage, submittedScene, openEditor } = useEditorHost();

  return (
    <main className="m-0 min-h-[calc(100vh-65px)] max-w-none px-12 py-14">
      <p className="mb-2.5 mt-0 text-[13px] font-extrabold uppercase text-brand">
        Host Demo
      </p>
      <h1 className="m-0 text-[clamp(40px,7vw,72px)] leading-[1.1] text-ink">
        postMessage 예시 페이지
      </h1>
      <p className="mt-[18px] max-w-[640px] text-lg leading-[1.7] text-ink-soft">
        이 페이지는 부모 서비스 역할을 합니다. 새 창으로 편집기를 열면 편집기가{" "}
        <code className="font-bold">MAP_EDITOR_READY</code>를 보내고, 이 페이지가{" "}
        <code className="font-bold">MAP_EDITOR_INIT</code>으로 샘플 scene을 전달합니다.{" "}
        편집기에서 저장하고 완료하면 공개 v2 scene을 다시 받아 아래에 표시합니다.
      </p>

      <div className="mt-7 flex items-center gap-4">
        <button
          className="rounded-lg bg-brand px-5 py-2.5 font-extrabold text-white transition-colors hover:bg-teal-800"
          onClick={openEditor}
          type="button"
        >
          편집기 새 창으로 열기
        </button>
        <span className="text-sm font-bold text-ink-soft" aria-live="polite">
          상태: {statusLabels[status]}
        </span>
      </div>

      {errorMessage ? (
        <p className="mt-3 max-w-[640px] rounded-md bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700">
          {errorMessage}
        </p>
      ) : null}

      {submittedScene ? (
        <section className="mt-7 max-w-4xl" aria-label="편집 결과">
          <h2 className="m-0 text-lg font-black text-ink">부모 창이 받은 편집 결과</h2>
          <p className="mb-3 mt-1 text-sm font-semibold text-ink-soft">
            내부 레이어 상태를 제외한{" "}
            <code className="font-bold">EditorSceneInput v2</code>
            형식입니다.
          </p>
          <pre
            className="max-h-[460px] overflow-auto rounded-xl bg-slate-950 p-4 text-xs leading-5 text-slate-100"
            data-testid="submitted-scene"
          >
            {JSON.stringify(submittedScene, null, 2)}
          </pre>
        </section>
      ) : null}

      <Link className="mt-7 inline-flex font-extrabold text-brand" to="/">
        Docs로 돌아가기
      </Link>
    </main>
  );
}
