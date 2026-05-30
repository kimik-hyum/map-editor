import { useEffect, useRef } from "react";
import type OpenLayersMap from "ol/Map";
import "ol/ol.css";
import { createOpenLayersMap, syncOpenLayersMapScene } from "./adapters/openlayers";
import { LayerPanel } from "./features/layers";
import { useEditorMessaging } from "./messaging";
import { useEditorStore } from "./state/editorStore";
import { useTempEditorSceneMessage } from "./temp/useTempEditorSceneMessage";

// 에디터 페이지의 지도 DOM을 준비하고 Zustand의 EditorScene을 OpenLayers 지도에 렌더링합니다.
export function EditorPage() {
  const mapElementRef = useRef<HTMLElement | null>(null);
  const mapRef = useRef<OpenLayersMap | null>(null);
  const scene = useEditorStore((state) => state.scene);
  // 부모 창이 있으면 postMessage로 scene을 받고, 없으면(단독 실행) 샘플 fixture를 주입합니다.
  useEditorMessaging();
  useTempEditorSceneMessage();

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

    syncOpenLayersMapScene(mapRef.current, scene);
  }, [scene]);

  return (
    <main className="relative min-h-0 min-w-0">
      <section
        ref={mapElementRef}
        className="h-screen w-full"
        aria-label="OSM map editor"
      />
      <LayerPanel />
    </main>
  );
}
