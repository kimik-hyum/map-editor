import { FloatingPanel } from "@/pages/editor/components/FloatingPanel";
import { useLayerPanelActions } from "../hooks/useLayerPanelActions";
import { useLayerPanelViewModel } from "../hooks/useLayerPanelViewModel";
import { FeatureStackRow } from "./FeatureStackRow";

// 1레이어 = 1도형 평탄 스택을 위(맨 앞)부터 나열합니다. 행 클릭 = 선택, 눈 아이콘 = 표시 토글.
export function LayerPanel() {
  const viewModel = useLayerPanelViewModel();
  const { toggleRowVisibility, selectFeature } = useLayerPanelActions();

  return (
    <FloatingPanel
      title="레이어"
      defaultPosition={{ x: 24, y: 24 }}
      defaultSize={{ width: 360, height: 520 }}
      minHeight={320}
      minWidth={320}
    >
      {!viewModel.isReady ? (
        <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-sm font-bold text-slate-500">
          도형을 불러오는 중
        </div>
      ) : viewModel.isEmpty ? (
        <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-sm font-bold text-slate-500">
          표시할 도형 없음
        </div>
      ) : (
        <div className="flex h-full min-h-0 flex-col gap-2">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <p className="m-0 text-xs font-black uppercase text-teal-700">Stack</p>
            <span className="text-[11px] font-black text-slate-500">
              {viewModel.featureCount}개 도형
            </span>
          </div>
          <ol className="m-0 grid min-h-0 list-none gap-1.5 overflow-auto p-0">
            {viewModel.rows.map((row) => (
              <FeatureStackRow
                key={row.id}
                row={row}
                onSelect={selectFeature}
                onToggleVisibility={toggleRowVisibility}
              />
            ))}
          </ol>
        </div>
      )}
    </FloatingPanel>
  );
}
