import "ol/ol.css";
import { MapCursorTooltip } from "@/shared/ui/MapCursorTooltip";
import { useEditorClipboard } from "./features/clipboard";
import { GeometryOpMarkers } from "./features/geometry-ops";
import { LayerPanel } from "./features/layers";
import { useOpenLayersEditorMap } from "./features/map";
import { EditorModePanel } from "./features/modes";
import { useRegionBoundaries, useRegionBoundaryOps } from "./features/regions";
import { useEditorMessaging } from "./messaging";
import { useEditorStore } from "./state/editorStore";
import { useEditorHistoryShortcuts } from "./state/historyShortcuts";
import { EditAffordanceKind, EditorMode } from "./types/editorTypes";

// 커서 위치의 편집 동작별 힌트 문구.
const EDIT_HINTS: Record<EditAffordanceKind, string> = {
  [EditAffordanceKind.Insert]: "클릭하여 정점 추가",
  [EditAffordanceKind.Delete]: "우클릭하여 정점 삭제",
};

// 에디터 페이지는 화면 배치만 담당합니다. 지도 수명주기와 편집 인터랙션은 hook/controller가 관리합니다.
export function EditorPage() {
  const { mapElementRef, map, editAffordance, geometryOp } = useOpenLayersEditorMap();
  const isSceneReady = useEditorStore((state) => state.scene !== null);
  const activeMode = useEditorStore((state) => state.activeMode);
  const activeBoundaryKind = useEditorStore((state) => state.activeBoundaryKind);
  const editHint = editAffordance ? EDIT_HINTS[editAffordance] : null;

  // 좌측 rail의 경계 도구가 활성일 때만, 거기서 고른 종류(행정동/법정동/우편번호)의
  // 경계를 현재 줌·화면으로 받아 그린다. 다른 모드로 바꾸면 비운다.
  const boundaryKind = activeMode === EditorMode.Boundary ? activeBoundaryKind : null;
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
  // Cmd/Ctrl+Z 되돌리기 · +Shift 다시하기. (그리기 중 마지막 점 취소 라우팅은 후속 #12·#46)
  useEditorHistoryShortcuts();
  // Cmd/Ctrl+C 복사 · Cmd/Ctrl+V 붙여넣기. 시스템 클립보드라 다른 에디터 창과도 공유된다(#76).
  useEditorClipboard();

  return (
    <div className="grid h-screen grid-cols-[88px_minmax(0,1fr)] overflow-hidden">
      <aside className="min-w-0 border-r border-line bg-white" aria-label="편집 도구">
        <EditorModePanel
          boundaryOperationError={regionOps.error}
          boundaryStatus={regionStatus}
        />
      </aside>
      <main className="relative min-h-0 min-w-0">
        <section
          ref={mapElementRef}
          className="h-screen w-full"
          aria-label="OSM map editor"
        />
        <MapCursorTooltip text={editHint} containerRef={mapElementRef} />
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
