import "ol/ol.css";
import { MapCursorTooltip } from "@/shared/ui/MapCursorTooltip";
import { useConfirmationDialogOpen } from "@/shared/ui/confirmation-dialog";
import { useEditorClipboard } from "./features/clipboard";
import { DrawFinishButton, DrawPolygonCloseButton, useDrawTool } from "./features/draw";
import { GeometryOpMarkers } from "./features/geometry-ops";
import { LayerPanel } from "./features/layers";
import { useOpenLayersEditorMap } from "./features/map";
import { EditorModePanel, getToolActivation } from "./features/modes";
import { useRadiusTool } from "./features/radius";
import { useRegionBoundaries, useRegionBoundaryOps } from "./features/regions";
import { useEditorMessaging } from "./messaging";
import { useEditorStore } from "./state/editorStore";
import { useEditorHistoryShortcuts } from "./state/historyShortcuts";
import { EditAffordanceKind, GeometryKind } from "./types/editorTypes";

// 커서 위치의 편집 동작별 힌트 문구.
const EDIT_HINTS: Record<EditAffordanceKind, string> = {
  [EditAffordanceKind.Insert]: "클릭하여 정점 추가",
  [EditAffordanceKind.Delete]: "우클릭하여 정점 삭제",
};

// 에디터 페이지는 화면 배치만 담당합니다. 지도 수명주기와 편집 인터랙션은 hook/controller가 관리합니다.
export function EditorPage() {
  const { mapElementRef, map, editAffordance, geometryOp } = useOpenLayersEditorMap();
  const drawTool = useDrawTool(map);
  const radiusTool = useRadiusTool(map);
  const isSceneReady = useEditorStore((state) => state.scene !== null);
  const activeMode = useEditorStore((state) => state.activeMode);
  const activeDrawShape = useEditorStore((state) => state.activeDrawShape);
  const activeBoundaryKind = useEditorStore((state) => state.activeBoundaryKind);
  const confirmationOpen = useConfirmationDialogOpen();
  const activation = getToolActivation(activeMode);
  const cursorHint = confirmationOpen
    ? null
    : (drawTool.hint ??
      radiusTool.hint ??
      (editAffordance ? EDIT_HINTS[editAffordance] : null));

  // 좌측 rail의 경계 도구가 활성일 때만, 거기서 고른 종류(행정동/법정동/우편번호)의
  // 경계를 현재 줌·화면으로 받아 그린다. 다른 모드로 바꾸면 비운다.
  const boundaryKind = activation.boundary ? activeBoundaryKind : null;
  const { layer: regionLayer, status: regionStatus } = useRegionBoundaries(
    map,
    boundaryKind,
  );
  // 경계 구역마다 +(추가/병합)·−(겹친 부분 빼기) 칩. 호버한 경계에만 노출.
  const regionOps = useRegionBoundaryOps({
    map,
    layer: regionLayer,
    enabled: boundaryKind !== null && isSceneReady,
    scopeKey: boundaryKind,
  });

  useEditorMessaging();
  // 그리기 중에는 정점 로컬 history를, sketch가 없으면 전역 scene history를 사용합니다.
  useEditorHistoryShortcuts({
    isInProgress: drawTool.isDrawingInProgress,
    onUndoInProgress: drawTool.undoVertex,
    onRedoInProgress: drawTool.redoVertex,
    onDiscardInProgressRedo: drawTool.discardRedo,
  });
  // Cmd/Ctrl+C 복사 · Cmd/Ctrl+V 붙여넣기. 진행 중 sketch에서는 clipboard를 모두 차단한다.
  useEditorClipboard({
    isDisabled: drawTool.isDrawingInProgress,
    onBeforePaste: drawTool.discardRedo,
  });

  return (
    <div className="grid h-screen grid-cols-[88px_minmax(0,1fr)] overflow-hidden">
      <aside className="min-w-0 border-r border-line bg-white" aria-label="편집 도구">
        <EditorModePanel
          boundaryOperationError={regionOps.error}
          boundaryStatus={regionStatus}
          confirmDiscardDraw={drawTool.confirmDiscardSketch}
          radiusTool={radiusTool}
        />
      </aside>
      <main className="relative min-h-0 min-w-0">
        <section
          ref={mapElementRef}
          className="peer h-screen w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-500"
          aria-label="OSM map editor"
          aria-describedby={activation.draw ? "draw-keyboard-instructions" : undefined}
          aria-keyshortcuts={
            activation.draw
              ? activeDrawShape === GeometryKind.Point
                ? "K Space"
                : "K Space Enter"
              : undefined
          }
          role="application"
          // biome-ignore lint/a11y/noNoninteractiveTabindex: OpenLayers 지도를 K·방향키·Space로 조작하는 application 위젯입니다.
          tabIndex={0}
        />
        <p className="sr-only" id="draw-keyboard-instructions">
          K 키로 키보드 조준 모드를 켠 뒤 방향키로 지도 중심을 이동하고 Space 키로 마커
          또는 정점을 추가합니다. K 키를 다시 누르면 조준 모드가 꺼집니다. 패스와 정점
          3개 이상의 폴리곤은 Enter 키로 완료할 수 있습니다.
        </p>
        {activation.draw && isSceneReady && drawTool.keyboardTargetingActive ? (
          <div
            aria-hidden
            data-testid="draw-keyboard-crosshair"
            className="pointer-events-none absolute left-1/2 top-1/2 z-30 hidden h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-teal-600/20 shadow-[0_0_0_1px_rgba(15,118,110,0.95)] peer-focus-visible:block"
          >
            <span className="absolute left-1/2 top-[-5px] h-8 w-px -translate-x-1/2 bg-teal-800" />
            <span className="absolute left-[-5px] top-1/2 h-px w-8 -translate-y-1/2 bg-teal-800" />
          </div>
        ) : null}
        <MapCursorTooltip text={cursorHint} containerRef={mapElementRef} />
        <DrawFinishButton
          enabled={drawTool.canFinish}
          onFinish={drawTool.finish}
          vertexCount={drawTool.vertexCount}
          visible={drawTool.showPathFinish}
        />
        <DrawPolygonCloseButton
          enabled={drawTool.canClosePolygon}
          onClose={drawTool.closePolygon}
          vertexCount={drawTool.vertexCount}
          visible={drawTool.showPolygonFinish}
        />
        <GeometryOpMarkers
          overlays={geometryOp.overlays}
          onMerge={geometryOp.onMerge}
          onSubtract={geometryOp.onSubtract}
        />
        <GeometryOpMarkers
          overlays={regionOps.overlays}
          onMerge={regionOps.onMerge}
          onSubtract={regionOps.onSubtract}
        />
        {isSceneReady ? (
          <LayerPanel />
        ) : (
          <div
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
            aria-live="polite"
          >
            <p className="rounded-lg bg-white/90 px-4 py-2 text-sm font-bold text-ink-soft shadow">
              호스트(부모 창)에서 데이터를 기다리는 중…
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
