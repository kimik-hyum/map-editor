import { Link } from "react-router";

export function EditorPage() {
  return (
    <main className="placeholder-page editor-placeholder">
      <p className="eyebrow">Editor</p>
      <h1>권역 편집 페이지</h1>
      <p className="lead">
        이 페이지는 OpenLayers 기반 지도와 polygon/path 편집 도구가 들어갈 실제
        편집기 화면입니다.
      </p>
      <Link className="text-link" to="/">
        Docs로 돌아가기
      </Link>
    </main>
  );
}
