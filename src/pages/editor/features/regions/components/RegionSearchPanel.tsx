import { Search, X, MapPin } from "lucide-react";
import { useId } from "react";
import type { useRegionSearch } from "../hooks/useRegionSearch";
import { REGION_SEARCH_MAX_LENGTH } from "../model/regionSearchModel";
import { RegionSearchResultRow } from "./RegionSearchResultRow";

type Props = {
  kind: string;
  label: string;
  search: ReturnType<typeof useRegionSearch>;
  onClose: () => void;
};
export function RegionSearchPanel({ kind, label, search, onClose }: Props) {
  const inputId = useId();
  const postal = kind === "postalCode";
  return (
    <section aria-label={`${label} 검색`} className="border-t border-line p-3">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-extrabold text-slate-700">{label} 검색</h3>
        <button
          type="button"
          aria-label={`${label} 검색 닫기`}
          onClick={onClose}
          className="rounded p-1 text-slate-400 hover:bg-slate-100"
        >
          <X aria-hidden className="h-4 w-4" />
        </button>
      </div>
      <div className="flex h-full min-h-0 flex-col gap-3">
        <form
          className="shrink-0"
          onSubmit={(event) => {
            event.preventDefault();
            search.searchNow();
          }}
        >
          <label
            htmlFor={inputId}
            className="mb-1.5 block text-[11px] font-extrabold text-slate-600"
          >
            {postal ? "우편번호 또는 지역명" : "동 이름 또는 지역명"}
          </label>
          <div className="flex items-center gap-2 rounded-md border border-slate-300 bg-white px-2.5 focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-100">
            <Search aria-hidden className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              id={inputId}
              value={search.input}
              maxLength={REGION_SEARCH_MAX_LENGTH}
              onChange={(event) => search.setInput(event.target.value)}
              onCompositionStart={() => search.setComposing(true)}
              onCompositionEnd={() => search.setComposing(false)}
              placeholder={postal ? "예: 030, 종로" : "예: 청운, 종로"}
              autoComplete="off"
              className="min-w-0 flex-1 border-0 bg-transparent py-2.5 text-sm font-bold text-slate-900 outline-none placeholder:font-normal placeholder:text-slate-400"
            />
            {search.input ? (
              <button
                type="button"
                aria-label="검색어 지우기"
                onClick={() => search.setInput("")}
                className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-slate-100"
              >
                <X aria-hidden className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
        </form>
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 pb-2">
          <p className="m-0 text-xs font-black text-teal-700">검색 결과</p>
          <span className="text-[11px] font-black text-slate-500" role="status">
            {search.waiting
              ? "검색 준비 중…"
              : search.loading
                ? "검색 중…"
                : `${search.items.length}${search.hasMore ? "+" : ""}개`}
          </span>
        </div>
        {search.error ? (
          <div
            role="alert"
            className="rounded-md border border-rose-200 bg-rose-50 p-3 text-xs leading-5 text-rose-700"
          >
            {search.error}
            <button
              type="button"
              onClick={search.retry}
              className="mt-2 block font-bold underline"
            >
              다시 시도
            </button>
          </div>
        ) : search.items.length ? (
          <ol
            aria-label={`${label} 검색 결과`}
            className="m-0 grid max-h-56 min-h-0 content-start gap-1.5 overflow-auto p-0"
          >
            {search.items.map((item) => (
              <RegionSearchResultRow
                key={item.id}
                item={item}
                selected={search.selectedId === item.id}
                onSelect={search.select}
              />
            ))}
          </ol>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
            <MapPin aria-hidden className="mb-1 h-6 w-6 text-slate-300" />
            <p className="m-0 text-xs font-bold text-slate-500">
              {search.waiting
                ? "입력을 멈추면 검색합니다"
                : search.loading
                  ? `${label} 검색 중입니다`
                  : search.hasQuery
                    ? "검색 결과가 없습니다"
                    : "검색어를 2자 이상 입력하세요"}
            </p>
            <p className="m-0 text-[11px] leading-5 text-slate-400">
              {search.hasQuery && !search.waiting && !search.loading
                ? "다른 지역명이나 코드를 입력해보세요."
                : "현재 화면 밖의 경계도 찾을 수 있습니다."}
            </p>
          </div>
        )}
        <p className="m-0 mt-auto shrink-0 border-t border-slate-200 pt-2 text-[11px] leading-5 text-slate-500">
          {search.hasMore
            ? "결과가 많습니다. 지역명이나 코드를 더 입력해주세요."
            : "목록을 누르면 해당 경계 위치로 이동합니다."}
        </p>
      </div>
    </section>
  );
}
