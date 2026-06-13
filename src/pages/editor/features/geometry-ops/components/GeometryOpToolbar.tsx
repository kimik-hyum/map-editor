import { Combine, SquaresExclude, X } from "lucide-react";

type GeometryOpToolbarProps = {
  // 선택한 도형의 화면 앵커(상단 중앙) 픽셀. null이면 숨깁니다.
  anchor: { x: number; y: number } | null;
  // 병합 가능(다른 편집 가능 폴리곤이 있음).
  canMerge: boolean;
  // 제거 가능(target과 실제 면적이 겹치는 폴리곤이 있음).
  canSubtract: boolean;
  // 상대 고르기 모드. null이면 버튼을, 아니면 안내 문구를 보여줍니다.
  pickMode: "merge" | "subtract" | null;
  onMerge: () => void;
  onSubtract: () => void;
  onCancelPick: () => void;
};

// 선택한 폴리곤 위(상단 중앙의 살짝 위)에 떠 있는 불리언 연산 툴바입니다.
// 평소엔 병합/제거 아이콘 버튼을, 상대 고르기 모드에선 "상대를 클릭" 안내를 보여줍니다.
// 위치는 지도 컨테이너 기준 절대좌표이며, 지도 팬/줌 시 앵커가 갱신됩니다.
export function GeometryOpToolbar({
  anchor,
  canMerge,
  canSubtract,
  pickMode,
  onMerge,
  onSubtract,
  onCancelPick,
}: GeometryOpToolbarProps) {
  // 숨김: 앵커가 없거나, 픽 모드가 아니면서 가능한 연산도 없을 때.
  if (!anchor || (!pickMode && !canMerge && !canSubtract)) {
    return null;
  }

  return (
    <div
      className="pointer-events-none absolute left-0 top-0 z-[1000]"
      style={{
        // 앵커(도형 상단 중앙) 위쪽에 가로 중앙 정렬로 띄운다.
        transform: `translate(${anchor.x}px, ${anchor.y}px) translate(-50%, calc(-100% - 12px))`,
      }}
    >
      {pickMode ? (
        <div className="pointer-events-auto flex items-center gap-2 whitespace-nowrap rounded-full bg-slate-900/90 px-3 py-1.5 text-xs font-bold text-white shadow-lg">
          <span>
            {pickMode === "merge" ? "병합할 도형을 클릭" : "제거할 도형을 클릭"}
          </span>
          <button
            aria-label="상대 고르기 취소"
            className="flex h-5 w-5 cursor-pointer items-center justify-center rounded-full border-0 bg-white/20 p-0 text-white hover:bg-white/30"
            onClick={onCancelPick}
            title="취소 (Esc)"
            type="button"
          >
            <X aria-hidden className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <div className="pointer-events-auto flex items-center gap-1 rounded-full bg-white/95 p-1 shadow-lg ring-1 ring-slate-200">
          {canMerge ? (
            <button
              aria-label="다른 폴리곤과 병합"
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-0 bg-emerald-50 p-0 text-emerald-600 hover:bg-emerald-100"
              onClick={onMerge}
              title="병합 (다른 도형과 합치기)"
              type="button"
            >
              <Combine aria-hidden className="h-4 w-4" />
            </button>
          ) : null}
          {canSubtract ? (
            <button
              aria-label="겹친 부분 제거"
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-0 bg-rose-50 p-0 text-rose-600 hover:bg-rose-100"
              onClick={onSubtract}
              title="제거 (겹친 부분 빼기)"
              type="button"
            >
              <SquaresExclude aria-hidden className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
