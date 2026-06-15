import { Minus, Plus } from "lucide-react";
import type { GeometryOpCandidate } from "../model/geometryOpsModel";

type GeometryOpCandidateRowProps = {
  candidate: GeometryOpCandidate;
  onMerge: () => void;
  onSubtract: () => void;
  // hover 시 지도에서 해당 도형을 강조하기 위해 hover 여부를 알립니다.
  onHover: (hovered: boolean) => void;
};

// 병합/제거 패널의 후보 한 줄: 이름(없으면 id) + 병합(+)·제거(−) 버튼.
// 별도 패널이라 이름이 가려질 일이 없고, hover하면 지도에서 그 도형이 강조됩니다.
export function GeometryOpCandidateRow({
  candidate,
  onMerge,
  onSubtract,
  onHover,
}: GeometryOpCandidateRowProps) {
  const label = candidate.name ?? candidate.featureId;

  return (
    <li
      className="flex items-center gap-2 rounded-md bg-slate-50 px-2 py-1.5"
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
    >
      <span className="min-w-0 flex-1 truncate text-sm font-bold text-slate-800">
        {label}
      </span>
      <button
        aria-label={`${label}와 병합`}
        className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded border-0 bg-emerald-50 p-0 text-emerald-600 hover:bg-emerald-100"
        onClick={onMerge}
        title="병합 (선택 도형과 합치기)"
        type="button"
      >
        <Plus aria-hidden className="h-4 w-4" />
      </button>
      {candidate.canSubtract ? (
        <button
          aria-label={`${label} 겹친 부분 제거`}
          className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded border-0 bg-rose-50 p-0 text-rose-600 hover:bg-rose-100"
          onClick={onSubtract}
          title="제거 (선택 도형에서 겹친 부분 빼기)"
          type="button"
        >
          <Minus aria-hidden className="h-4 w-4" />
        </button>
      ) : null}
    </li>
  );
}
