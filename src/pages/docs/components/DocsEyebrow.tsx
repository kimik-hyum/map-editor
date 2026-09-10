import type { ReactNode } from "react";
import { cn } from "@/shared/utils/cn";

type DocsEyebrowProps = {
  children: ReactNode;
  className?: string;
  line?: boolean;
};

// 섹션·히어로 상단의 작은 대문자 라벨. 앞에 짧은 브랜드 색 선을 둬 시선을 잡습니다.
// 카드 배지처럼 선 없이 라벨만 쓸 때는 line={false}를 줍니다.
export function DocsEyebrow({ children, className, line = true }: DocsEyebrowProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 text-[13px] font-extrabold uppercase tracking-wide text-brand",
        className,
      )}
    >
      {line ? <span aria-hidden="true" className="h-px w-6 bg-brand-line" /> : null}
      {children}
    </span>
  );
}
