import { useT } from "@/shared/i18n/useT";
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
import { Layers3, Plus } from "lucide-react";
import { PanelShell } from "@/pages/editor/components/PanelShell";
import type { HoleFillTool } from "@/pages/editor/features/hole-fill";
import { useLayerPanelActions } from "../hooks/useLayerPanelActions";
import { useLayerPanelViewModel } from "../hooks/useLayerPanelViewModel";
import { FeatureStackRow } from "./FeatureStackRow";

// 1레이어 = 1도형 평탄 스택을 위(맨 앞)부터 나열합니다.
// 행 클릭 = 선택, 눈/자물쇠 = 토글, 순서 이동 = 끌기 핸들(⠿) 드래그(키보드는 핸들 포커스 후 스페이스+방향키).
type LayerPanelProps = {
  holeFillTool: HoleFillTool;
  blockedReason: string | null;
};

export function LayerPanel({ holeFillTool, blockedReason }: LayerPanelProps) {
  const t = useT();
  const viewModel = useLayerPanelViewModel();
  const {
    addEmptyLayer,
    drawInRow,
    toggleRowVisibility,
    toggleRowLock,
    selectFeature,
    reorderRow,
    deleteRow,
    renameRow,
    beginRenameRow,
    endRenameRow,
  } = useLayerPanelActions();

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
    const activeRow = viewModel.rows.find((row) => row.layerId === active.id);
    const overRow = viewModel.rows.find((row) => row.layerId === over.id);
    if (activeRow && overRow) {
      reorderRow(activeRow.layerId, overRow.layerId);
    }
  };

  return (
    <PanelShell
      ariaLabel={t("레이어")}
      className="bg-white"
      bodyClassName="flex min-h-0 flex-col p-3"
      headerClassName="bg-slate-50 px-3 py-2.5"
      header={
        <h2 className="m-0 flex items-center gap-2 text-xs font-extrabold text-slate-700">
          <Layers3 aria-hidden className="h-4 w-4" />
          {t("레이어 관리")}
        </h2>
      }
    >
      <div className="flex h-full min-h-0 flex-col gap-2">
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-200 pb-2">
          <span className="text-[11px] font-black text-slate-500">
            {viewModel.featureCount}
            {t("개 도형")}
            {viewModel.emptyLayerCount > 0
              ? t(" · 빈 레이어 {{v0}}개", { v0: viewModel.emptyLayerCount })
              : ""}
          </span>
          <button
            aria-label={t("레이어 추가")}
            className="flex shrink-0 items-center gap-1 rounded-md bg-teal-700 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={
              !viewModel.isReady ||
              blockedReason !== null ||
              viewModel.renamingFeatureId !== null ||
              viewModel.renamingEmptyLayerId !== null
            }
            onClick={addEmptyLayer}
            title={blockedReason ?? t("새 빈 레이어 만들기")}
            type="button"
          >
            <Plus aria-hidden className="h-3.5 w-3.5" />
            {t("새 레이어")}
          </button>
        </div>
        {!viewModel.isReady || viewModel.isEmpty ? (
          <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-center text-sm font-bold text-slate-500">
            {viewModel.isReady
              ? t("새 레이어를 추가해 도형을 그려보세요")
              : t("도형을 불러오는 중")}
          </div>
        ) : (
          <DndContext
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis, restrictToParentElement]}
            onDragEnd={handleDragEnd}
            sensors={sensors}
          >
            <SortableContext
              items={viewModel.rows.map((row) => row.layerId)}
              strategy={verticalListSortingStrategy}
            >
              <ol className="m-0 grid min-h-0 list-none gap-1.5 overflow-auto p-0">
                {viewModel.rows.map((row) => (
                  <FeatureStackRow
                    key={row.layerId}
                    holeFillTool={holeFillTool}
                    blockedReason={blockedReason}
                    isRenaming={
                      row.isEmpty
                        ? viewModel.renamingEmptyLayerId === row.layerId
                        : viewModel.renamingFeatureId === row.id
                    }
                    renameBlocked={
                      viewModel.renamingFeatureId !== null ||
                      viewModel.renamingEmptyLayerId !== null
                    }
                    onDraw={drawInRow}
                    onDelete={deleteRow}
                    onCancelRename={endRenameRow}
                    onRename={renameRow}
                    onStartRename={beginRenameRow}
                    row={row}
                    onSelect={selectFeature}
                    onToggleLock={toggleRowLock}
                    onToggleVisibility={toggleRowVisibility}
                  />
                ))}
              </ol>
            </SortableContext>
          </DndContext>
        )}
        {viewModel.emptyLayerCount > 0 ? (
          <p className="m-0 shrink-0 text-[11px] leading-relaxed text-slate-500">
            {t(
              "빈 레이어를 선택한 뒤 그리기 도구를 사용하세요. 레이어마다 도형 하나를 담으며, 빈 레이어는 완료 결과에 포함되지 않습니다.",
            )}
          </p>
        ) : null}
        {blockedReason ? (
          <p role="status" className="m-0 text-[11px] text-slate-500">
            {blockedReason}
          </p>
        ) : null}
      </div>
    </PanelShell>
  );
}
