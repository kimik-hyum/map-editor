import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { FloatingPanel } from "@/pages/editor/components/FloatingPanel";
import { useLayerPanelActions } from "../hooks/useLayerPanelActions";
import { useLayerPanelViewModel } from "../hooks/useLayerPanelViewModel";
import { FeatureStackRow } from "./FeatureStackRow";

// 1레이어 = 1도형 평탄 스택을 위(맨 앞)부터 나열합니다.
// 행 클릭 = 선택, 눈/자물쇠 = 토글, 순서 이동 = 끌기 핸들(⠿) 드래그(키보드는 핸들 포커스 후 스페이스+방향키).
export function LayerPanel() {
  const viewModel = useLayerPanelViewModel();
  const { toggleRowVisibility, toggleRowLock, selectFeature, reorderRow } =
    useLayerPanelActions();

  // 드래그는 끌기 핸들에서만 시작된다. 약간의 이동 거리 제한으로 단순 클릭과 구분한다.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }
    const activeRow = viewModel.rows.find((row) => row.id === active.id);
    const overRow = viewModel.rows.find((row) => row.id === over.id);
    if (activeRow && overRow) {
      reorderRow(activeRow.layerId, overRow.layerId);
    }
  };

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
          {/* 세로축 고정 + 목록(부모) 경계 클램프: 아래·위로 무한히 끌려 스크롤 영역이 늘어나는 것을 막는다. */}
          <DndContext
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis, restrictToParentElement]}
            onDragEnd={handleDragEnd}
            sensors={sensors}
          >
            <SortableContext
              items={viewModel.rows.map((row) => row.id)}
              strategy={verticalListSortingStrategy}
            >
              <ol className="m-0 grid min-h-0 list-none gap-1.5 overflow-auto p-0">
                {viewModel.rows.map((row) => (
                  <FeatureStackRow
                    key={row.id}
                    row={row}
                    onSelect={selectFeature}
                    onToggleLock={toggleRowLock}
                    onToggleVisibility={toggleRowVisibility}
                  />
                ))}
              </ol>
            </SortableContext>
          </DndContext>
        </div>
      )}
    </FloatingPanel>
  );
}
