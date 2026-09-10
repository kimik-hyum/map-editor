import type { ReactNode } from "react";
import { cn } from "@/shared/utils/cn";

type DocsListProps = {
  children: ReactNode;
  className?: string;
};

// 체크 아이콘이 붙는 문서용 목록. DocsListItem을 자식으로 받습니다.
export function DocsList({ children, className }: DocsListProps) {
  return (
    <ul
      className={cn(
        "m-0 grid max-w-[680px] grid-cols-1 list-none gap-2.5 p-0",
        className,
      )}
    >
      {children}
    </ul>
  );
}
