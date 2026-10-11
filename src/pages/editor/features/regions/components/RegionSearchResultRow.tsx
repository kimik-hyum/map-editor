import { MapPin, ArrowUpRight } from "lucide-react";
import { cn } from "@/shared/utils/cn";
import type { RegionSearchItem } from "../model/regionSearchModel";

type Props = {
  item: RegionSearchItem;
  selected: boolean;
  onSelect: (item: RegionSearchItem) => void;
};
export function RegionSearchResultRow({ item, selected, onSelect }: Props) {
  return (
    <li>
      <button
        type="button"
        aria-label={`${item.context} ${item.name} 위치로 이동`.trim()}
        aria-pressed={selected}
        title={`${item.context} ${item.name}`.trim()}
        onClick={() => onSelect(item)}
        className={cn(
          "flex w-full min-w-0 items-center gap-2.5 rounded-md px-2.5 py-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-indigo-500",
          selected
            ? "bg-indigo-50 ring-1 ring-inset ring-indigo-300"
            : "bg-slate-50 hover:bg-slate-100",
        )}
      >
        <MapPin
          aria-hidden
          className={cn(
            "h-4 w-4 shrink-0",
            selected ? "text-indigo-600" : "text-slate-400",
          )}
        />
        <span className="min-w-0 flex-1">
          <span className="block break-words text-sm font-black leading-5 text-slate-950">
            {item.name}
          </span>
          {item.context ? (
            <span className="mt-0.5 block break-words text-[11px] font-bold leading-4 text-slate-500">
              {item.context}
            </span>
          ) : null}
          <span className="mt-1 flex items-center gap-2 text-[10px] font-semibold text-slate-400">
            <span>{item.code}</span>
            {selected ? <span className="text-indigo-600">현재 위치</span> : null}
          </span>
        </span>
        <ArrowUpRight aria-hidden className="h-4 w-4 shrink-0 text-slate-400" />
      </button>
    </li>
  );
}
