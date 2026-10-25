import { useT } from "@/shared/i18n/useT";
import { PanelRightClose, PanelRightOpen, SlidersHorizontal } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/shared/utils/cn";
export function EditorRightDock({
  open,
  onOpenChange,
  options,
  layers,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  options: ReactNode;
  layers: ReactNode;
}) {
  const t = useT();
  return (
    <aside
      aria-label={t("속성과 레이어 패널")}
      className={cn(
        "absolute inset-y-0 right-0 z-30 flex h-full flex-col border-l border-slate-200 bg-white shadow-[-4px_0_18px_rgba(15,23,42,0.03)]",
        open ? "w-[340px] max-w-[calc(100vw-88px)]" : "w-10",
      )}
    >
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-slate-200 bg-slate-50 px-2">
        {open && (
          <span className="px-1 text-[10px] font-black tracking-wider text-slate-500">
            {t("작업 패널")}
          </span>
        )}
        <button
          type="button"
          aria-label={open ? t("오른쪽 패널 접기") : t("오른쪽 패널 펼치기")}
          title={open ? t("오른쪽 패널 접기") : t("도구 옵션 · 레이어")}
          aria-expanded={open}
          aria-controls="editor-dock-content"
          onClick={() => onOpenChange(!open)}
          className="rounded p-1 text-slate-500 hover:bg-slate-200"
        >
          {open ? (
            <PanelRightClose aria-hidden className="h-4 w-4" />
          ) : (
            <PanelRightOpen aria-hidden className="h-4 w-4" />
          )}
        </button>
      </div>
      <div
        id="editor-dock-content"
        className={cn(
          "min-h-0 flex-1 grid-rows-[minmax(0,1fr)_minmax(0,1.15fr)]",
          open ? "grid" : "hidden",
        )}
      >
        <section
          aria-label={t("도구 옵션")}
          className="flex min-h-0 flex-col border-b-4 border-slate-200"
        >
          <h2 className="m-0 flex shrink-0 items-center gap-2 border-b border-line bg-slate-50 px-3 py-2.5 text-xs font-extrabold text-slate-700">
            <SlidersHorizontal aria-hidden className="h-4 w-4" />
            {t("도구 옵션")}
          </h2>
          <div className="min-h-0 flex-1 overflow-y-auto">{options}</div>
        </section>
        <div className="min-h-0">{layers}</div>
      </div>
    </aside>
  );
}
