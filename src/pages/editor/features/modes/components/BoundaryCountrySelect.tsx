import { Combobox } from "@base-ui/react/combobox";
import { Check, ChevronDown, Globe2, Search } from "lucide-react";
import {
  boundaryCountries,
  matchesBoundaryCountry,
  type BoundaryCountry,
  type BoundaryCountryCode,
} from "@/shared/config/boundaryCountries";

export function BoundaryCountrySelect({
  value,
  onChange,
  disabled,
}: {
  value: BoundaryCountryCode;
  onChange: (country: BoundaryCountryCode) => void;
  disabled?: boolean;
}) {
  const country =
    boundaryCountries.find((item) => item.code === value) ?? boundaryCountries[0];
  return (
    <div className="border-b border-line px-2 pb-3 pt-1">
      <p className="mb-1.5 text-[11px] font-bold text-slate-500">국가</p>
      <Combobox.Root
        items={boundaryCountries}
        value={country}
        itemToStringLabel={(item: BoundaryCountry) => item.label}
        isItemEqualToValue={(a, b) => a.code === b.code}
        filter={matchesBoundaryCountry}
        autoHighlight
        onValueChange={(item) => {
          if (item) onChange(item.code);
        }}
      >
        <Combobox.Trigger
          aria-label={`국가 선택: ${country.label}`}
          disabled={disabled}
          className="flex w-full items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-left text-sm font-bold text-slate-800 hover:border-teal-500 disabled:opacity-50"
        >
          <Globe2 aria-hidden className="h-4 w-4 shrink-0 text-teal-700" />
          <span className="min-w-0 flex-1 truncate">{country.label}</span>
          <span className="text-[11px] font-semibold text-slate-400">
            {country.code}
          </span>
          <ChevronDown aria-hidden className="h-4 w-4 text-slate-400" />
        </Combobox.Trigger>
        <Combobox.Portal>
          <Combobox.Positioner sideOffset={6} align="start" className="z-[60]">
            <Combobox.Popup
              aria-label="국가 찾기"
              className="w-72 max-w-[calc(100vw-24px)] overflow-hidden rounded-xl border border-line bg-white shadow-xl"
            >
              <div className="flex items-center gap-2 border-b border-line px-3 py-2">
                <Search aria-hidden className="h-4 w-4 shrink-0 text-slate-400" />
                <Combobox.Input
                  aria-label="국가 이름 또는 코드 검색"
                  placeholder="국가 이름 또는 코드 검색"
                  className="min-w-0 flex-1 bg-transparent py-1.5 text-sm text-slate-900 outline-none"
                />
              </div>
              <Combobox.Empty className="px-4 py-6 text-center text-xs text-slate-500 empty:hidden">
                지원하는 국가를 찾지 못했습니다.
              </Combobox.Empty>
              <Combobox.List className="max-h-60 overflow-y-auto overscroll-contain p-1.5">
                {(item: BoundaryCountry) => (
                  <Combobox.Item
                    key={item.code}
                    value={item}
                    className="flex cursor-default items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-800 outline-none data-[highlighted]:bg-teal-50 data-[highlighted]:text-teal-900"
                  >
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="font-bold">{item.label}</span>
                      <span className="text-[11px] text-slate-500">
                        {item.englishName} · {item.code}
                      </span>
                    </span>
                    <Combobox.ItemIndicator>
                      <Check aria-hidden className="h-4 w-4 text-teal-700" />
                    </Combobox.ItemIndicator>
                  </Combobox.Item>
                )}
              </Combobox.List>
              <p className="border-t border-line px-3 py-2 text-[11px] text-slate-500">
                경계 데이터가 제공되는 국가만 표시합니다.
              </p>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
    </div>
  );
}
