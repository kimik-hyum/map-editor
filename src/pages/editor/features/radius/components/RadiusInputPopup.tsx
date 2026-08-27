import { Popover } from "@base-ui/react/popover";
import { CircleDot, X } from "lucide-react";
import { type FormEvent, type RefObject, useRef } from "react";
import { MAX_RADIUS_KM, MIN_RADIUS_KM } from "../model/radiusToolModel";

type RadiusInputPopupProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  anchor: RefObject<HTMLButtonElement | null>;
  markerName: string | null;
  draft: string;
  onDraftChange: (draft: string) => void;
  error: string | null;
  canApply: boolean;
  onApply: () => boolean;
  onCancel: () => void;
};

export function RadiusInputPopup({
  open,
  onOpenChange,
  anchor,
  markerName,
  draft,
  onDraftChange,
  error,
  canApply,
  onApply,
  onCancel,
}: RadiusInputPopupProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onApply();
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
            aria-label="반경 입력"
            className="w-64 rounded-xl border border-line bg-white p-3 shadow-xl outline-none"
            initialFocus={inputRef}
          >
            <form className="grid gap-3" onSubmit={submit}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-100 text-teal-700">
                    <CircleDot
                      aria-hidden
                      className="h-[18px] w-[18px]"
                      strokeWidth={2}
                    />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[13px] font-black text-slate-900">반경 입력</p>
                    <p className="truncate text-[11px] font-semibold text-slate-400">
                      기준: {markerName ?? "선택한 마커"}
                    </p>
                  </div>
                </div>
                <button
                  aria-label="반경 입력 취소"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                  onClick={onCancel}
                  type="button"
                >
                  <X aria-hidden className="h-4 w-4" strokeWidth={2} />
                </button>
              </div>

              <label className="grid gap-1" htmlFor="radius-km-input">
                <span className="text-[11px] font-extrabold text-slate-600">반경</span>
                <span className="flex items-center overflow-hidden rounded-lg border border-slate-300 bg-white focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-100">
                  <input
                    aria-describedby="radius-input-help radius-input-error"
                    className="min-w-0 flex-1 border-0 px-3 py-2 text-sm font-bold text-slate-900 outline-none"
                    id="radius-km-input"
                    inputMode="decimal"
                    onChange={(event) => onDraftChange(event.target.value)}
                    onFocus={(event) => event.currentTarget.select()}
                    placeholder="예: 1.25"
                    ref={inputRef}
                    type="text"
                    value={draft}
                  />
                  <span className="border-l border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-500">
                    km
                  </span>
                </span>
              </label>

              <div className="min-h-8">
                <p
                  className="text-[10px] font-semibold text-slate-400"
                  id="radius-input-help"
                >
                  {MIN_RADIUS_KM}–{MAX_RADIUS_KM.toLocaleString("ko-KR")}km · 소수점
                  이하 2자리
                </p>
                <p
                  aria-live="polite"
                  className="mt-1 text-[11px] font-bold text-red-600"
                  id="radius-input-error"
                >
                  {error}
                </p>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  className="rounded-lg px-3 py-2 text-xs font-extrabold text-slate-500 transition-colors hover:bg-slate-100"
                  onClick={onCancel}
                  type="button"
                >
                  취소
                </button>
                <button
                  className="rounded-lg bg-teal-700 px-3 py-2 text-xs font-extrabold text-white transition-colors hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                  disabled={!canApply}
                  type="submit"
                >
                  원형 폴리곤 추가
                </button>
              </div>
            </form>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
