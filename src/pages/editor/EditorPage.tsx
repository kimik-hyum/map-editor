import { useEffect, useRef } from "react";
import type OpenLayersMap from "ol/Map";
import "ol/ol.css";
import { createOpenLayersMap, syncOpenLayersMapDocument } from "./adapters/openlayers";
import { LayerPanel } from "./features/layers";
import { useEditorStore } from "./state/editorStore";
import { useTempEditorDocumentMessage } from "./temp/useTempEditorDocumentMessage";

// 에디터 페이지의 지도 DOM을 준비하고 Zustand의 EditorDocument를 OpenLayers 지도에 렌더링합니다.
export function EditorPage() {
  const mapElementRef = useRef<HTMLElement | null>(null);
  const mapRef = useRef<OpenLayersMap | null>(null);
  const editorDocument = useEditorStore((state) => state.document);
  useTempEditorDocumentMessage();

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

    syncOpenLayersMapDocument(mapRef.current, editorDocument);
  }, [editorDocument]);

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
