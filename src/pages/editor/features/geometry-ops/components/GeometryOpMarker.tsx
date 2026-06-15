import { Minus, Plus } from "lucide-react";

type GeometryOpMarkerProps = {
  // 후보 폴리곤 표시명(이름, 없으면 호출부가 id로 폴백해 항상 채워 보낸다).
  name: string;
  // 선택 도형과 겹쳐 "제거(−)"가 가능한 후보인지. 아니면 병합(+)만 노출.
  canSubtract: boolean;
  onMerge: () => void;
  onSubtract: () => void;
};

// 후보 폴리곤 하나의 내부 대표점에 뜨는 칩입니다(위치는 ol/Overlay가 잡으므로 내용만 그림).
// 이름과 +/- 버튼을 "두 행"으로 보여준다 — 이름 행(전체 표시, 길면 줄바꿈) + 버튼 행.
// 한 행에 욱여넣다 긴 이름이 잘려 사라지던 문제를 피한다.
// +(병합): 그 폴리곤을 선택 도형과 합칩니다. −(제거): 선택 도형에서 그 폴리곤과 겹친 부분을 뺍니다.
export function GeometryOpMarker({
  name,
  canSubtract,
  onMerge,
  onSubtract,
}: GeometryOpMarkerProps) {
  return (
    <div className="flex max-w-[200px] flex-col items-center gap-1 rounded-2xl bg-white/95 px-2 py-1 shadow-lg ring-1 ring-slate-200">
      <span className="w-full break-words text-center text-[11px] font-bold leading-tight text-slate-700">
        {name}
      </span>
      <div className="flex items-center gap-1">
        <button
          aria-label={`${name} 병합`}
          className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-emerald-50 p-0 text-emerald-600 hover:bg-emerald-100"
          onClick={onMerge}
          title="병합 (선택 도형과 합치기)"
          type="button"
        >
          <Plus aria-hidden className="h-3.5 w-3.5" />
        </button>
        {canSubtract ? (
          <button
            aria-label={`${name} 겹친 부분 제거`}
            className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-rose-50 p-0 text-rose-600 hover:bg-rose-100"
            onClick={onSubtract}
            title="제거 (선택 도형에서 겹친 부분 빼기)"
            type="button"
          >
            <Minus aria-hidden className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
