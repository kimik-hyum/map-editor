import { Popover } from "@base-ui/react/popover";
import { PaintBucket, X } from "lucide-react";
import { useId } from "react";
import type { HoleFillTool } from "../hooks/useHoleFillTool";

export function HoleFillPopup({ tool }: { tool: HoleFillTool }) {
  const inputId = useId();
  const helpId = useId();
  const preview = tool.preview;
  return (
    <Popover.Root
      modal
      open={tool.isOpen}
      onOpenChange={(open) => {
        if (!open) tool.close();
      }}
    >
      <Popover.Portal>
        <Popover.Positioner
          anchor={tool.session?.anchor}
          align="start"
          side="right"
          sideOffset={10}
          className="z-50"
        >
          <Popover.Popup
            aria-label="빈 공간 채우기"
            finalFocus={tool.anchorRef}
            className="w-72 max-w-[calc(100vw-24px)] rounded-xl border border-line bg-white p-4 shadow-xl outline-none"
          >
            <div className="mb-3 flex items-center gap-2">
              <PaintBucket aria-hidden className="h-4 w-4 text-teal-700" />
              <Popover.Title className="flex-1 text-sm font-black text-slate-900">
                빈 공간 채우기
              </Popover.Title>
              <Popover.Close
                aria-label="빈 공간 채우기 닫기"
                title="닫기"
                className="rounded p-1 text-slate-400 hover:bg-slate-100"
              >
                <X aria-hidden className="h-4 w-4" />
              </Popover.Close>
            </div>
            <p
              className="mb-3 truncate text-xs font-bold text-slate-700"
              title={tool.session?.name}
            >
              대상: {tool.session?.name}
            </p>
            <label
              htmlFor={inputId}
              className="mb-1 block text-xs font-bold text-slate-700"
            >
              채울 구멍의 최대 면적 (㎡)
            </label>
            <input
              id={inputId}
              type="number"
              min="0"
              step="any"
              value={tool.areaInput}
              onChange={(event) => tool.setAreaInput(event.target.value)}
              aria-describedby={helpId}
              aria-invalid={tool.error !== null}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            />
            <Popover.Description
              id={helpId}
              className="mt-2 text-[11px] leading-5 text-slate-500"
            >
              완전히 둘러싸인 구멍만 채웁니다. 바깥으로 열린 틈과 기준보다 큰 구멍은
              유지됩니다.
            </Popover.Description>
            <div
              className="my-3 rounded-lg bg-teal-50 p-3 text-xs leading-5 text-teal-800"
              role="status"
              aria-live="polite"
            >
              <p className="font-bold">
                전체 {tool.totalHoleCount}개 중 {preview?.filledCount ?? 0}개 채우기
              </p>
              <p>
                {preview
                  ? `추가 면적 약 ${preview.addedAreaSquareMeters.toLocaleString("ko-KR", { maximumFractionDigits: 1 })}㎡ · 지도에 청록색 표시`
                  : "현재 기준으로 채울 구멍이 없습니다."}
              </p>
            </div>
            {tool.error ? (
              <p role="alert" className="mb-3 text-xs text-rose-600">
                {tool.error}
              </p>
            ) : null}
            <div className="flex justify-end gap-2">
              <Popover.Close className="rounded-md border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">
                취소
              </Popover.Close>
              <button
                type="button"
                onClick={tool.apply}
                disabled={!preview || tool.error !== null}
                className="rounded-md bg-teal-700 px-3 py-2 text-xs font-bold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                채우기 적용
              </button>
            </div>
            <p className="mt-2 text-right text-[10px] text-slate-400">
              적용 후 실행 취소로 복원할 수 있습니다.
            </p>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
