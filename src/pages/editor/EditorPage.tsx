import { useEffect, useRef } from "react";
import type OpenLayersMap from "ol/Map";
import "ol/ol.css";
import { createOpenLayersMap, syncOpenLayersMapScene } from "./adapters/openlayers";
import { LayerPanel } from "./features/layers";
import { useEditorMessaging } from "./messaging";
import { useEditorStore } from "./state/editorStore";
import { useEditorHistoryShortcuts } from "./state/historyShortcuts";
import type { EditorScene } from "./types/editorTypes";

// 에디터 페이지의 지도 DOM을 준비하고 Zustand의 EditorScene을 OpenLayers 지도에 렌더링합니다.
// 에디터는 순수 consumer입니다. scene은 부모(호스트) 창이 postMessage로 전달해야만 채워집니다.
export function EditorPage() {
  const mapElementRef = useRef<HTMLElement | null>(null);
  const mapRef = useRef<OpenLayersMap | null>(null);
  const scene = useEditorStore((state) => state.scene);
  useEditorMessaging();
  // Cmd/Ctrl+Z 되돌리기 · +Shift 다시하기. (그리기 중 마지막 점 취소 라우팅은 후속 #12·#46)
  useEditorHistoryShortcuts();

  useEffect(() => {
    if (!mapElementRef.current || mapRef.current) {
      return;
    }

    mapRef.current = createOpenLayersMap({
      target: mapElementRef.current,
    });

    return () => {
      mapRef.current?.setTarget(undefined);
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) {
      return;
    }

    // 스토어 스냅샷은 깊은 readonly. 어댑터는 scene을 읽기만 하므로 경계에서 mutable로 캐스팅한다.
    syncOpenLayersMapScene(mapRef.current, scene as EditorScene | null);
  }, [scene]);

  return (
    <main className="relative min-h-0 min-w-0">
      <section
        ref={mapElementRef}
        className="h-screen w-full"
        aria-label="OSM map editor"
      />
      {scene ? (
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
