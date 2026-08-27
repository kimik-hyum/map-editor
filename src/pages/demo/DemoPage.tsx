import {
  Callout,
  DocsArticle,
  DocsButton,
  DocsCode,
  DocsHero,
  DocsSection,
} from "@/pages/docs/components";
import { useEditorHost, type EditorHostStatus } from "./host/useEditorHost";

const statusLabels: Record<EditorHostStatus, string> = {
  idle: "대기 중",
  opening: "에디터 여는 중 · READY 신호 대기",
  connected: "연결됨 · scene 전달 완료",
  closed: "에디터 창이 닫힘",
  error: "오류",
};

// 데모는 문서형 페이지라 docs 디자인 시스템(타이포·섹션 프리미티브)을 재사용합니다.
export function DemoPage() {
  const { status, errorMessage, openEditor } = useEditorHost();

  return (
    <DocsArticle>
      <DocsHero
        description={
          <>
            이 페이지는 부모 서비스 역할을 합니다. 새 창으로 편집기를 열면 편집기가{" "}
            <DocsCode>MAP_EDITOR_READY</DocsCode>를 보내고, 이 페이지가{" "}
            <DocsCode>MAP_EDITOR_INIT</DocsCode>으로 샘플 scene을 전달합니다.
          </>
        }
        eyebrow="Host Demo"
        id="host-overview"
        title="postMessage 예시 페이지"
      />

      <DocsSection id="launch-editor">
        <div className="flex flex-wrap items-center gap-4">
          <DocsButton onClick={openEditor}>편집기 새 창으로 열기</DocsButton>
          {/* 실행 상태를 읽어 주는 라이브 영역이라 타이포 컴포넌트 대신 span을 유지합니다. */}
          <span aria-live="polite" className="text-sm font-bold text-ink-soft">
            상태: {statusLabels[status]}
          </span>
        </div>

        {errorMessage ? (
          <Callout className="mt-5 max-w-[640px]" tone="error">
            {errorMessage}
          </Callout>
        ) : null}

        <div className="mt-9">
          <DocsButton to="/" variant="secondary">
            Docs로 돌아가기
          </DocsButton>
        </div>
      </DocsSection>
    </DocsArticle>
  );
}
