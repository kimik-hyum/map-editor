import type { ReactNode } from "react";

type DocsCodeProps = {
  children: ReactNode;
};

// 메시지 이름·식별자 같은 인라인 코드 표기. 모노스페이스 칩 모양으로,
// 키보드 단축키용 DocsKbd(브랜드 칩)와 시각적으로 구분됩니다.
export function DocsCode({ children }: DocsCodeProps) {
  return (
    <code className="rounded-md border border-line bg-white px-1.5 py-0.5 font-mono text-[13px] font-bold text-ink-soft">
      {children}
    </code>
  );
}
