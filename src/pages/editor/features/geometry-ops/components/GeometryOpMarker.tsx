import { Minus, Plus } from "lucide-react";

type GeometryOpMarkerProps = {
  // 후보 도형의 화면 앵커(상단 중앙) 픽셀.
  x: number;
  y: number;
  // 선택 도형과 겹쳐 "제거(−)"가 가능한 후보인지. 아니면 병합(+)만 노출.
  canSubtract: boolean;
  onMerge: () => void;
  onSubtract: () => void;
};

// 선택된 폴리곤을 제외한 "다른 폴리곤" 하나 위에 떠 있는 연산 마커입니다.
// +(병합): 그 폴리곤을 선택 도형과 합칩니다. −(제거): 선택 도형에서 그 폴리곤과 겹친 부분을 뺍니다.
export function GeometryOpMarker({
  x,
  y,
  canSubtract,
  onMerge,
  onSubtract,
}: GeometryOpMarkerProps) {
  return (
    <div
      className="pointer-events-none absolute left-0 top-0 z-[1000]"
      style={{
        transform: `translate(${x}px, ${y}px) translate(-50%, calc(-100% - 8px))`,
      }}
    >
      <div className="pointer-events-auto flex items-center gap-1 rounded-full bg-white/95 p-1 shadow-lg ring-1 ring-slate-200">
        <button
          aria-label="이 폴리곤과 병합"
          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border-0 bg-emerald-50 p-0 text-emerald-600 hover:bg-emerald-100"
          onClick={onMerge}
          title="병합 (선택 도형과 합치기)"
          type="button"
        >
          <Plus aria-hidden className="h-4 w-4" />
        </button>
        {canSubtract ? (
          <button
            aria-label="겹친 부분 제거"
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border-0 bg-rose-50 p-0 text-rose-600 hover:bg-rose-100"
            onClick={onSubtract}
            title="제거 (선택 도형에서 겹친 부분 빼기)"
            type="button"
          >
            <Minus aria-hidden className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
