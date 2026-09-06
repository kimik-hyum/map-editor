import { CircleCheckBig } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/shared/utils/cn";
import { DocsText } from "./DocsText";

type DocsListProps = {
  children: ReactNode;
  className?: string;
};

// 체크 아이콘이 붙는 문서용 목록. DocsListItem을 자식으로 받습니다.
export function DocsList({ children, className }: DocsListProps) {
  return (
    <ul className={cn("m-0 grid max-w-[680px] list-none gap-2.5 p-0", className)}>
      {children}
    </ul>
  );
}

type DocsListItemProps = {
  children: ReactNode;
};

export function DocsListItem({ children }: DocsListItemProps) {
  return (
    <li className="flex items-start gap-2.5">
      <CircleCheckBig
        aria-hidden="true"
        className="mt-[5px] shrink-0 text-brand"
        size={15}
        strokeWidth={2.6}
      />
      <DocsText className="min-w-0" tone="soft">
        {children}
      </DocsText>
    </li>
  );
}
