import { Minus, Plus } from "lucide-react";

type GeometryOpMarkerProps = {
  // 후보 폴리곤 이름. 칩에 함께 표시합니다. 없으면 버튼만 보입니다.
  name?: string;
  // 선택 도형과 겹쳐 "제거(−)"가 가능한 후보인지. 아니면 병합(+)만 노출.
  canSubtract: boolean;
  onMerge: () => void;
  onSubtract: () => void;
};

// 후보 폴리곤 하나의 내부 대표점에 뜨는 칩입니다(위치는 ol/Overlay가 잡으므로 내용만 그림).
// 이름과 +/- 버튼을 한 묶음으로 보여줘 "이 폴리곤의 동작"임을 분명히 합니다.
// +(병합): 그 폴리곤을 선택 도형과 합칩니다. −(제거): 선택 도형에서 그 폴리곤과 겹친 부분을 뺍니다.
export function GeometryOpMarker({
  name,
  canSubtract,
  onMerge,
  onSubtract,
}: GeometryOpMarkerProps) {
  return (
    <div className="flex max-w-[180px] items-center gap-1 rounded-full bg-white/95 py-0.5 pl-2 pr-0.5 shadow-lg ring-1 ring-slate-200">
      {name ? (
        <span className="truncate text-[11px] font-bold leading-none text-slate-700">
          {name}
        </span>
      ) : null}
      <button
        aria-label={name ? `${name} 병합` : "이 폴리곤과 병합"}
        className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-emerald-50 p-0 text-emerald-600 hover:bg-emerald-100"
        onClick={onMerge}
        title="병합 (선택 도형과 합치기)"
        type="button"
      >
        <Plus aria-hidden className="h-3.5 w-3.5" />
      </button>
      {canSubtract ? (
        <button
          aria-label={name ? `${name} 겹친 부분 제거` : "겹친 부분 제거"}
          className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-rose-50 p-0 text-rose-600 hover:bg-rose-100"
          onClick={onSubtract}
          title="제거 (선택 도형에서 겹친 부분 빼기)"
          type="button"
        >
          <Minus aria-hidden className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}
