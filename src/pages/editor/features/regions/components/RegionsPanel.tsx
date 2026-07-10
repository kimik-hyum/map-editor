import { FloatingPanel } from "@/pages/editor/components/FloatingPanel";
import type { RegionBoundaryStatus } from "../hooks/useRegionBoundaries";
import { useRegionKinds } from "../hooks/useRegionKinds";
import { RegionKindButton } from "./RegionKindButton";

type RegionsPanelProps = {
  activeKind: string | null;
  onSelect: (kind: string | null) => void;
  status: RegionBoundaryStatus;
  operationError: string | null;
};

// "경계 보기" 사이드 메뉴입니다. region_kind에서 받은 종류를 버튼으로 띄우고,
// 누르면 그 kind와 현재 줌으로 경계를 요청해 지도에 그립니다(다시 누르면 끔).
export function RegionsPanel({
  activeKind,
  onSelect,
  status,
  operationError,
}: RegionsPanelProps) {
  const { data: kinds, isLoading, isError } = useRegionKinds();

  // 서버가 실제로 내려준 종류의 표시 라벨(줌 아웃 시 시군구가 올 수 있음).
  const returnedLabel =
    kinds?.find((kind) => kind.kind === status.kind)?.label ?? status.kind ?? "-";

  return (
    <FloatingPanel
      title="경계 보기"
      defaultPosition={{ x: 16, y: 16 }}
      defaultSize={{ width: 232, height: 300 }}
      minWidth={200}
      minHeight={200}
    >
      <div className="flex flex-col gap-1">
        {isLoading ? (
          <p className="px-1 py-2 text-xs text-slate-400">종류 불러오는 중…</p>
        ) : null}
        {isError ? (
          <p className="px-1 py-2 text-xs font-semibold text-red-600">종류 로드 실패</p>
        ) : null}
        {kinds
          ?.filter((kind) => kind.selectable)
          .map((kind) => (
            <RegionKindButton
              key={kind.kind}
              label={kind.label}
              active={activeKind === kind.kind}
              onClick={() => onSelect(activeKind === kind.kind ? null : kind.kind)}
            />
          ))}
      </div>

      <div className="mt-3 border-t border-line pt-2 text-xs text-slate-500">
        {activeKind === null ? (
          <span>종류를 누르면 화면에 경계가 그려집니다.</span>
        ) : status.loading ? (
          <span>경계 불러오는 중…</span>
        ) : status.error || operationError ? (
          <span className="font-semibold text-red-600">
            {status.error ?? operationError}
          </span>
        ) : (
          <span>
            현재 화면: <b className="text-slate-700">{returnedLabel}</b> ·{" "}
            {status.count}개
            {status.kind && status.kind !== activeKind ? (
              <span className="text-slate-400"> (줌 아웃 → 상위 구역)</span>
            ) : null}
            {status.truncated ? (
              <span className="text-amber-600">
                {" "}
                · 일부만 표시됨 — 지도를 확대하세요
              </span>
            ) : null}
          </span>
        )}
      </div>
    </FloatingPanel>
  );
}
