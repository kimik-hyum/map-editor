import { Link } from "react-router";

export function DemoPage() {
  return (
    <main className="placeholder-page">
      <p className="eyebrow">Host Demo</p>
      <h1>postMessage 예시 페이지</h1>
      <p className="lead">
        이 페이지는 부모 서비스 역할을 하며, 새 창으로 편집기를 열고 polygon/path
        payload를 전달하는 예시 화면으로 확장될 예정입니다.
      </p>
      <Link className="text-link" to="/">
        Docs로 돌아가기
      </Link>
    </main>
  );
}
