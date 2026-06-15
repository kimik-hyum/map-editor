import { FloatingPanel } from "@/pages/editor/components/FloatingPanel";
import { useGeometryOps } from "../hooks/useGeometryOps";
import { GeometryOpCandidateRow } from "./GeometryOpCandidateRow";

// 선택한 폴리곤(target)과 합치거나(+) 겹친 부분을 뺄(−) 후보를 보여주는 별도 패널입니다.
// 지도 위 도형/이름 라벨은 건드리지 않고, 후보 행에 hover하면 지도에서 그 도형이 강조됩니다.
// 단일 편집 폴리곤이 선택됐을 때만 뜹니다(그 외에는 렌더하지 않음).
export function GeometryOpPanel() {
  const { targetId, candidates, merge, subtract, setHovered } = useGeometryOps();

  if (!targetId) {
    return null;
  }

  return (
    <FloatingPanel
      title="병합 / 제거"
      defaultPosition={{ x: 408, y: 24 }}
      defaultSize={{ width: 300, height: 360 }}
      minHeight={200}
      minWidth={260}
    >
      <div className="flex h-full min-h-0 flex-col gap-2">
        <p className="m-0 text-[11px] font-bold leading-snug text-slate-500">
          선택한 도형과 <span className="text-emerald-600">합치기(+)</span> · 겹친 부분{" "}
          <span className="text-rose-600">빼기(−)</span>
        </p>
        {candidates.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 text-center text-sm font-bold text-slate-500">
            합치거나 뺄 다른 도형이 없습니다
          </div>
        ) : (
          <ul className="m-0 grid min-h-0 list-none gap-1.5 overflow-auto p-0">
            {candidates.map((candidate) => (
              <GeometryOpCandidateRow
                candidate={candidate}
                key={candidate.featureId}
                onHover={(hovered) => setHovered(hovered ? candidate.featureId : null)}
                onMerge={() => merge(candidate.featureId)}
                onSubtract={() => subtract(candidate.featureId)}
              />
            ))}
          </ul>
        )}
      </div>
    </FloatingPanel>
  );
}
