import { Tabs } from "@base-ui/react/tabs";
import type { ReactNode } from "react";
import { cn } from "../../../shared/utils/cn";

// Base UI Tabs에 에디터 표준 세그먼트 스타일을 한 번만 입힌 래퍼입니다.
// 호출처마다 긴 className 함수를 복붙하지 않도록 List/Tab 스타일을 여기로 모았습니다.

function SegmentedTabsList({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <Tabs.List className={cn("grid gap-1 rounded-lg bg-slate-100 p-1", className)}>
      {children}
    </Tabs.List>
  );
}

function SegmentedTabsTab({ value, children }: { value: string; children: ReactNode }) {
  return (
    <Tabs.Tab
      className={({ active }) =>
        cn(
          "rounded-md px-3 py-2 text-sm font-black transition-colors",
          active ? "bg-white text-ink shadow-sm" : "text-slate-500 hover:bg-white/60",
        )
      }
      value={value}
    >
      {children}
    </Tabs.Tab>
  );
}

export const SegmentedTabs = {
  Root: Tabs.Root,
  List: SegmentedTabsList,
  Tab: SegmentedTabsTab,
  Panel: Tabs.Panel,
};
