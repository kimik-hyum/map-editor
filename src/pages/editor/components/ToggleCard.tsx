import { Toggle } from "@base-ui/react/toggle";
import type { ReactNode } from "react";
import { cn } from "../../../shared/utils/cn";

type ToggleCardProps = {
  value: string;
  children: ReactNode;
  className?: string;
};

// Base UI Toggle에 에디터 카드형 선택 스타일을 입힌 래퍼입니다.
// 선택 상태는 Base UI의 data-pressed로만 표현하므로 호출자가 selected를 따로 넘기지 않습니다.
// 내부 콘텐츠는 group-data-[pressed]: 변형으로 선택 스타일을 받습니다.
export function ToggleCard({ value, children, className }: ToggleCardProps) {
  return (
    <Toggle
      className={cn(
        "group w-full rounded-lg border px-3 py-2.5 text-left transition-colors",
        "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
        "data-[pressed]:border-teal-500 data-[pressed]:bg-teal-50 data-[pressed]:shadow-sm",
        className,
      )}
      value={value}
    >
      {children}
    </Toggle>
  );
}
