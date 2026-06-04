import "ol/ol.css";
import { MapCursorTooltip } from "@/shared/ui/MapCursorTooltip";
import { LayerPanel } from "./features/layers";
import { useOpenLayersEditorMap } from "./features/map";
import { useEditorMessaging } from "./messaging";
import { useEditorStore } from "./state/editorStore";
import { useEditorHistoryShortcuts } from "./state/historyShortcuts";

// 선택된 도형 위에서 보여줄 편집 힌트 문구.
const EDITING_HINT = "정점 편집 — 외곽선 클릭: 추가 · 우클릭: 삭제";

// 에디터 페이지는 화면 배치만 담당합니다. 지도 수명주기와 편집 인터랙션은 hook/controller가 관리합니다.
export function EditorPage() {
  const { mapElementRef, editingHintActive } = useOpenLayersEditorMap();
  const isSceneReady = useEditorStore((state) => state.scene !== null);

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
      <MapCursorTooltip
        text={editingHintActive ? EDITING_HINT : null}
        containerRef={mapElementRef}
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
