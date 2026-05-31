import { Popover } from "@base-ui/react/popover";
import { X } from "lucide-react";
import type { RefObject } from "react";
import {
  MovingHighlight,
  MovingHighlightItem,
} from "../../../../../shared/ui/MovingHighlight";
import { cn } from "../../../../../shared/utils/cn";
import { useEditorStore } from "../../../state/editorStore";
import type { BoundaryKind } from "../../../types/editorTypes";
import { boundaryKindOptions } from "../model/boundaryKindModel";

type BoundaryKindPopupProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  anchor: RefObject<HTMLButtonElement | null>;
};

// 경계 도구를 선택하면 rail의 경계 버튼 옆에 뜨는 작은 팝업입니다.
// 경계 데이터 종류(행정동/법정동/우편번호)만 고르고, 병합·더하기·빼기 같은 처리는 폴리곤 흐름에서 담당합니다.
export function BoundaryKindPopup({
  open,
  onOpenChange,
  anchor,
}: BoundaryKindPopupProps) {
  const activeBoundaryKind = useEditorStore((state) => state.activeBoundaryKind);
  const setActiveBoundaryKind = useEditorStore((state) => state.setActiveBoundaryKind);

  // 선택해도 팝업은 닫지 않습니다. 닫기는 헤더의 닫기 버튼이나 바깥 클릭으로 합니다.
  const handleSelect = (kind: BoundaryKind) => {
    setActiveBoundaryKind(kind);
  };

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
            aria-label="경계 종류"
            className="w-52 rounded-xl border border-line bg-white p-1.5 shadow-xl outline-none"
          >
            <div className="flex items-center justify-between gap-2 px-2 pb-1.5 pt-1">
              <p className="text-[11px] font-black tracking-wide text-slate-400">
                경계 종류
              </p>
              <button
                aria-label="경계 종류 닫기"
                className="flex h-6 w-6 flex-none items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                onClick={() => onOpenChange(false)}
                type="button"
              >
                <X aria-hidden className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>
            <MovingHighlight
              activeValue={activeBoundaryKind}
              className="grid gap-0.5"
              indicatorClassName="rounded-lg bg-teal-50 ring-1 ring-teal-300"
            >
              {boundaryKindOptions.map((option) => {
                const Icon = option.icon;
                const selected = option.id === activeBoundaryKind;

                return (
                  <MovingHighlightItem key={option.id} value={option.id}>
                    <button
                      aria-pressed={selected}
                      className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-slate-50/70"
                      onClick={() => handleSelect(option.id)}
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
