import type { ReactNode } from "react";
import { cn } from "@/shared/utils/cn";

type DocsHeadingLevel = 1 | 2 | 3;

type DocsHeadingProps = {
  children: ReactNode;
  className?: string;
  id?: string;
  level: DocsHeadingLevel;
};

// 문서 제목 계층을 한곳에서 관리합니다. level이 시맨틱 태그(h1~h3)와 스타일을
// 함께 결정합니다: 1 = 페이지 제목, 2 = 섹션 제목, 3 = 소제목(카드·단계 등).
const headingClassName: Record<DocsHeadingLevel, string> = {
  1: "m-0 text-[clamp(34px,5vw,52px)] font-black leading-[1.1] tracking-tight text-ink",
  2: "m-0 text-2xl font-extrabold tracking-tight text-ink",
  3: "m-0 text-base font-bold text-ink",
};

export function DocsHeading({ children, className, id, level }: DocsHeadingProps) {
  const Tag = `h${level}` as const;

  return (
    <Tag className={cn(headingClassName[level], className)} id={id}>
      {children}
    </Tag>
  );
}
