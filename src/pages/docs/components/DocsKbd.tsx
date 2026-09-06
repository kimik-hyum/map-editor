import type { ReactNode } from "react";

type DocsKbdProps = {
  children: ReactNode;
};

// 키보드 단축키 표기. kbd 시맨틱에 브랜드 칩 모양을 입힙니다.
// kbd 기본 모노스페이스 대신 본문과 같은 글꼴을 씁니다.
export function DocsKbd({ children }: DocsKbdProps) {
  return (
    <kbd className="rounded-md bg-brand-soft px-1.5 py-0.5 font-sans text-[13px] font-bold text-brand">
      {children}
    </kbd>
  );
}
