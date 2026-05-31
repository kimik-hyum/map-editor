import { Popover } from "@base-ui/react/popover";
import { type LucideIcon, X } from "lucide-react";
import type { RefObject } from "react";
import { MovingHighlight, MovingHighlightItem } from "@/shared/ui/MovingHighlight";
import { cn } from "@/shared/utils/cn";

export type ToolOption<T extends string> = {
  id: T;
  label: string;
  description: string;
  icon: LucideIcon;
};

type ToolOptionPopupProps<T extends string> = {
  // 팝업 제목 겸 접근성 라벨입니다.
  title: string;
  options: ToolOption<T>[];
  activeId: T;
  onSelect: (id: T) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  anchor: RefObject<HTMLButtonElement | null>;
};

// 도구(rail) 옆에 붙는 하위 옵션 선택 팝업입니다. 경계 종류·그리기 도형 등에 공용으로 씁니다.
// 선택해도 닫지 않고, 헤더 닫기 버튼이나 바깥 클릭으로 닫습니다. 선택 표시는 MovingHighlight가 담당합니다.
export function ToolOptionPopup<T extends string>({
  title,
  options,
  activeId,
  onSelect,
  open,
  onOpenChange,
  anchor,
}: ToolOptionPopupProps<T>) {
  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      <Popover.Portal>
        <Popover.Positioner
          anchor={anchor}
          align="start"
          className="z-50"
          side="right"
          sideOffset={10}
        >
          <Popover.Popup
            aria-label={title}
            className="w-52 rounded-xl border border-line bg-white p-1.5 shadow-xl outline-none"
          >
            <div className="flex items-center justify-between gap-2 px-2 pb-1.5 pt-1">
              <p className="text-[11px] font-black tracking-wide text-slate-400">
                {title}
              </p>
              <button
                aria-label={`${title} 닫기`}
                className="flex h-6 w-6 flex-none items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                onClick={() => onOpenChange(false)}
                type="button"
              >
                <X aria-hidden className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>
            <MovingHighlight
              activeValue={activeId}
              className="grid gap-0.5"
              indicatorClassName="rounded-lg bg-teal-50 ring-1 ring-teal-300"
            >
              {options.map((option) => {
                const Icon = option.icon;
                const selected = option.id === activeId;

                return (
                  <MovingHighlightItem key={option.id} value={option.id}>
                    <button
                      aria-pressed={selected}
                      className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-slate-50/70"
                      onClick={() => onSelect(option.id)}
                      type="button"
                    >
                      <span
                        className={cn(
                          "flex h-8 w-8 flex-none items-center justify-center rounded-lg",
                          selected
                            ? "bg-teal-100 text-teal-700"
                            : "bg-slate-100 text-slate-500",
                        )}
                      >
                        <Icon
                          aria-hidden
                          className="h-[18px] w-[18px]"
                          strokeWidth={2}
                        />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[13px] font-extrabold text-slate-900">
                          {option.label}
                        </span>
                        <span className="block text-[11px] font-semibold text-slate-400">
                          {option.description}
                        </span>
                      </span>
                    </button>
                  </MovingHighlightItem>
                );
              })}
            </MovingHighlight>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
