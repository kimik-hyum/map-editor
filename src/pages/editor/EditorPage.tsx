import "ol/ol.css";
import { MapCursorTooltip } from "@/shared/ui/MapCursorTooltip";
import { GeometryOpToolbar } from "./features/geometry-ops";
import { LayerPanel } from "./features/layers";
import { useOpenLayersEditorMap } from "./features/map";
import { useEditorMessaging } from "./messaging";
import { useEditorStore } from "./state/editorStore";
import { useEditorHistoryShortcuts } from "./state/historyShortcuts";
import { EditAffordanceKind } from "./types/editorTypes";

// 커서 위치의 편집 동작별 힌트 문구.
const EDIT_HINTS: Record<EditAffordanceKind, string> = {
  [EditAffordanceKind.Insert]: "클릭하여 정점 추가",
  [EditAffordanceKind.Delete]: "우클릭하여 정점 삭제",
};

// 에디터 페이지는 화면 배치만 담당합니다. 지도 수명주기와 편집 인터랙션은 hook/controller가 관리합니다.
export function EditorPage() {
  const { mapElementRef, editAffordance, geometryOp } = useOpenLayersEditorMap();
  const isSceneReady = useEditorStore((state) => state.scene !== null);
  const editHint = editAffordance ? EDIT_HINTS[editAffordance] : null;

  useEditorMessaging();
  // Cmd/Ctrl+Z 되돌리기 · +Shift 다시하기. (그리기 중 마지막 점 취소 라우팅은 후속 #12·#46)
  useEditorHistoryShortcuts();

  return (
    <main className="relative min-h-0 min-w-0">
      <section
        ref={mapElementRef}
        className="h-screen w-full"
        aria-label="OSM map editor"
      />
      <MapCursorTooltip text={editHint} containerRef={mapElementRef} />
      <GeometryOpToolbar
        anchor={geometryOp.anchor}
        canMerge={geometryOp.canMerge}
        canSubtract={geometryOp.canSubtract}
        pickMode={geometryOp.pickMode}
        onMerge={geometryOp.onMerge}
        onSubtract={geometryOp.onSubtract}
        onCancelPick={geometryOp.onCancelPick}
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
  );
}
