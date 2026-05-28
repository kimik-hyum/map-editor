import { useEffect, useRef } from "react";
import "ol/ol.css";
import { createOpenLayersMap } from "./adapters/openlayers";
import { FloatingPanel } from "./components/FloatingPanel";
import { useEditorStore } from "./state/editorStore";
import { useTempEditorDocumentMessage } from "./temp/useTempEditorDocumentMessage";

// 에디터 페이지의 지도 DOM을 준비하고 Zustand의 EditorDocument를 OpenLayers 지도에 렌더링합니다.
export function EditorPage() {
  const mapElementRef = useRef<HTMLElement | null>(null);
  const editorDocument = useEditorStore((state) => state.document);
  useTempEditorDocumentMessage();

  useEffect(() => {
    if (!mapElementRef.current || !editorDocument) {
      return;
    }

    const map = createOpenLayersMap({
      target: mapElementRef.current,
      editorDocument,
    });

    return () => {
      map.setTarget(undefined);
    };
  }, [editorDocument]);

  return (
    <main className="relative min-h-0 min-w-0">
      <section
        ref={mapElementRef}
        className="h-screen w-full"
        aria-label="OSM map editor"
      />
      <FloatingPanel title="레이어" />
    </main>
  );
}
