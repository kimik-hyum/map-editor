import { useT } from "@/shared/i18n/useT";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { MovingHighlight, MovingHighlightItem } from "@/shared/ui/MovingHighlight";
import { cn } from "@/shared/utils/cn";
export type ToolOption<T extends string> = {
  id: T;
  label: string;
  description: string;
  icon: LucideIcon;
};
export function ToolOptionsSection<T extends string>({
  title,
  options,
  activeId,
  onSelect,
  header,
  footer,
  notice,
}: {
  title: string;
  options: ToolOption<T>[];
  activeId: T;
  onSelect: (id: T) => void;
  header?: ReactNode;
  footer?: ReactNode;
  notice?: string;
}) {
  const t = useT();
  return (
    <section aria-label={title} className="p-3">
      <h3 className="mb-3 text-sm font-extrabold text-slate-800">{title}</h3>
      {header}
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
                  <Icon aria-hidden className="h-[18px] w-[18px]" strokeWidth={2} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-extrabold text-slate-900">
                    {t(option.label)}
                  </span>
                  <span className="block text-[11px] font-semibold text-slate-400">
                    {t(option.description)}
                  </span>
                </span>
              </button>
            </MovingHighlightItem>
          );
        })}
      </MovingHighlight>
      {notice ? (
        <p className="px-2 pb-1 pt-2 text-[11px] font-semibold text-slate-400">
          {notice}
        </p>
      ) : null}
      {footer ? (
        <div className="mt-1 border-t border-line px-2 pb-1 pt-2">{footer}</div>
      ) : null}
    </section>
  );
}
