import type { ReactNode } from "react";
import { cn } from "@/shared/utils/cn";

type DocsArticleProps = {
  children: ReactNode;
  className?: string;
};

// 모든 문서 페이지의 바깥 래퍼. 읽기 좋은 폭과 섹션 사이 세로 리듬을 한곳에서 관리합니다.
export function DocsArticle({ children, className }: DocsArticleProps) {
  return (
    <article className={cn("flex max-w-[960px] flex-col gap-14", className)}>
      {children}
    </article>
  );
}
