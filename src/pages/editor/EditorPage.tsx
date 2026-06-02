import { useEffect, useRef } from "react";
import type OpenLayersMap from "ol/Map";
import "ol/ol.css";
import {
  attachEditorSelection,
  createOpenLayersMap,
  createVertexOverlayLayer,
  type EditorRenderState,
  syncOpenLayersMapScene,
  syncVertexOverlay,
} from "./adapters/openlayers";
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
  const vertexLayerRef = useRef<ReturnType<typeof createVertexOverlayLayer> | null>(
    null,
  );
  // 선택/호버는 scene 밖 store 상태입니다. 어댑터 스타일 함수가 참조하도록 같은 객체를 제자리로 갱신합니다.
  const renderStateRef = useRef<EditorRenderState>({
    selectedIds: new Set<string>(),
    hoveredId: null,
  });

  const scene = useEditorStore((state) => state.scene);
  const selectedFeatureIds = useEditorStore((state) => state.selectedFeatureIds);
  const hoveredFeatureId = useEditorStore((state) => state.hoveredFeatureId);

  useEditorMessaging();
  // Cmd/Ctrl+Z 되돌리기 · +Shift 다시하기. (그리기 중 마지막 점 취소 라우팅은 후속 #12·#46)
  useEditorHistoryShortcuts();

  useEffect(() => {
    if (!mapElementRef.current || mapRef.current) {
      return;
    }

    const map = createOpenLayersMap({ target: mapElementRef.current });
    mapRef.current = map;

    const vertexLayer = createVertexOverlayLayer();
    map.addLayer(vertexLayer);
    vertexLayerRef.current = vertexLayer;

    const detachSelection = attachEditorSelection(map, {
      getScene: () => useEditorStore.getState().scene as EditorScene | null,
      onSelect: (featureIds) =>
        useEditorStore.getState().setSelectedFeatureIds(featureIds),
      onHover: (featureId) => useEditorStore.getState().setHoveredFeatureId(featureId),
    });

    return () => {
      detachSelection();
      map.setTarget(undefined);
      mapRef.current = null;
      vertexLayerRef.current = null;
    };
  }, []);

  // scene 변경 → 콘텐츠 레이어 + 정점 오버레이 재구성.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    syncOpenLayersMapScene(map, scene as EditorScene | null, renderStateRef.current);
    if (vertexLayerRef.current) {
      syncVertexOverlay(
        vertexLayerRef.current,
        scene as EditorScene | null,
        renderStateRef.current.selectedIds,
      );
    }
  }, [scene]);

  // 선택 변경 → 스타일 함수가 읽는 selectedIds 갱신 + 재렌더 + 정점 오버레이 갱신(scene 재빌드 없음).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    renderStateRef.current.selectedIds = new Set(selectedFeatureIds);
    map.render();
    if (vertexLayerRef.current) {
      syncVertexOverlay(
        vertexLayerRef.current,
        useEditorStore.getState().scene as EditorScene | null,
        renderStateRef.current.selectedIds,
      );
    }
  }, [selectedFeatureIds]);

  // 호버 변경 → 강조 알파만 갱신(재렌더만).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    renderStateRef.current.hoveredId = hoveredFeatureId;
    map.render();
  }, [hoveredFeatureId]);

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
