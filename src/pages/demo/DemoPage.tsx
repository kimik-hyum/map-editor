import { Link } from "react-router";

export function DemoPage() {
  return (
    <main className="m-0 min-h-[calc(100vh-65px)] max-w-none px-12 py-14">
      <p className="mb-2.5 mt-0 text-[13px] font-extrabold uppercase text-brand">
        Host Demo
      </p>
      <h1 className="m-0 text-[clamp(40px,7vw,72px)] leading-[1.1] text-ink">
        postMessage 예시 페이지
      </h1>
      <p className="mt-[18px] max-w-[640px] text-lg leading-[1.7] text-ink-soft">
        이 페이지는 부모 서비스 역할을 하며, 새 창으로 편집기를 열고 polygon/path
        payload를 전달하는 예시 화면으로 확장될 예정입니다.
      </p>
      <Link className="mt-7 inline-flex font-extrabold text-brand" to="/">
        Docs로 돌아가기
      </Link>
    </main>
  );
}
