import { useEffect, useRef } from "react";
import type OpenLayersMap from "ol/Map";
import { unByKey } from "ol/Observable";
import "ol/ol.css";
import {
  attachEditorSelection,
  attachVertexDetail,
  attachVertexModify,
  createOpenLayersMap,
  createVertexDetailOverlayLayer,
  createVertexOverlayLayer,
  type EditorRenderState,
  invalidateFeatureStyles,
  type ProjectedVertex,
  projectSelectedVertices,
  syncOpenLayersMapScene,
  syncVertexOverlay,
  type VertexOverlayViewInfo,
} from "./adapters/openlayers";
import { LayerPanel } from "./features/layers";
import { useEditorMessaging } from "./messaging";
import { useEditorStore } from "./state/editorStore";
import { useEditorHistoryShortcuts } from "./state/historyShortcuts";
import type { EditorScene } from "./types/editorTypes";

// 호버 시 커서로부터 이 픽셀 반경 안의 정점을 상세로 드러냅니다(편집 grab 허용보다 크게).
const VERTEX_DETAIL_RADIUS_PX = 28;

// 현재 ol View에서 정점 컬링/LOD에 필요한 뷰 상태를 읽습니다. 아직 레이아웃 전이면 undefined.
function readVertexViewInfo(map: OpenLayersMap): VertexOverlayViewInfo | undefined {
  const view = map.getView();
  const size = map.getSize();
  const zoom = view.getZoom();
  const resolution = view.getResolution();
  if (zoom === undefined || resolution === undefined || !size) {
    return undefined;
  }
  return { zoom, resolution, extent: view.calculateExtent(size) };
}

// 에디터 페이지의 지도 DOM을 준비하고 Zustand의 EditorScene을 OpenLayers 지도에 렌더링합니다.
// 에디터는 순수 consumer입니다. scene은 부모(호스트) 창이 postMessage로 전달해야만 채워집니다.
export function EditorPage() {
  const mapElementRef = useRef<HTMLElement | null>(null);
  const mapRef = useRef<OpenLayersMap | null>(null);
  const vertexLayerRef = useRef<ReturnType<typeof createVertexOverlayLayer> | null>(
    null,
  );
  const detailLayerRef = useRef<ReturnType<
    typeof createVertexDetailOverlayLayer
  > | null>(null);
  // 선택/호버는 scene 밖 store 상태입니다. 어댑터 스타일 함수가 참조하도록 같은 객체를 제자리로 갱신합니다.
  const renderStateRef = useRef<EditorRenderState>({
    selectedIds: new Set<string>(),
    hoveredId: null,
  });
  // 현재 선택된 도형의 전체 투영 정점. 호버 상세에서 커서 반경 질의에 사용합니다.
  const selectedVerticesRef = useRef<ProjectedVertex[]>([]);
  // 정점 편집(Modify) 핸들. 선택 변경/씬 재빌드 때 선택 도형으로 재바인딩합니다.
  const modifyRef = useRef<ReturnType<typeof attachVertexModify> | null>(null);

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

    const detailLayer = createVertexDetailOverlayLayer();
    map.addLayer(detailLayer);
    detailLayerRef.current = detailLayer;

    const detachSelection = attachEditorSelection(map, {
      getScene: () => useEditorStore.getState().scene as EditorScene | null,
      onSelect: (featureIds) =>
        useEditorStore.getState().setSelectedFeatureIds(featureIds),
      onHover: (featureId) => useEditorStore.getState().setHoveredFeatureId(featureId),
    });

    // 호버 시 커서 주변 반경의 전체 정점을 상세로 드러냅니다(detail-on-demand).
    const detachDetail = attachVertexDetail(map, {
      layer: detailLayer,
      getVertices: () => selectedVerticesRef.current,
      radiusPx: VERTEX_DETAIL_RADIUS_PX,
    });

    // 선택 도형의 정점 편집(드래그 이동 / 우클릭 삭제). modifyend에만 store에 커밋.
    const modify = attachVertexModify(map, {
      onModifyStart: () => {
        // 편집 중에는 대표점/상세 핸들을 치워 Modify 자체 핸들에 맡긴다.
        vertexLayerRef.current?.getSource()?.clear(true);
        detailLayerRef.current?.getSource()?.clear(true);
      },
      onCommit: (featureId, geometry) =>
        useEditorStore.getState().updateFeatureGeometry(featureId, geometry),
      onModifyEnd: () => {
        // 커밋이 no-op이어도(좌표 무변화) 대표점을 복구한다(커밋 시엔 scene effect가 한 번 더 갱신).
        if (!vertexLayerRef.current) {
          return;
        }
        syncVertexOverlay(
          vertexLayerRef.current,
          useEditorStore.getState().scene as EditorScene | null,
          renderStateRef.current.selectedIds,
          readVertexViewInfo(map),
        );
      },
    });
    modifyRef.current = modify;

    // 팬/줌이 끝나면 정점 오버레이를 현재 화면 기준으로 다시 계산(뷰포트 컬링 + 줌 LOD).
    const moveEndKey = map.on("moveend", () => {
      if (!vertexLayerRef.current) {
        return;
      }
      syncVertexOverlay(
        vertexLayerRef.current,
        useEditorStore.getState().scene as EditorScene | null,
        renderStateRef.current.selectedIds,
        readVertexViewInfo(map),
      );
    });

    return () => {
      detachSelection();
      detachDetail();
      modify.detach();
      unByKey(moveEndKey);
      map.setTarget(undefined);
      mapRef.current = null;
      vertexLayerRef.current = null;
      detailLayerRef.current = null;
      modifyRef.current = null;
    };
  }, []);

  // scene 변경 → 콘텐츠 레이어 + 정점 오버레이 재구성.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    syncOpenLayersMapScene(map, scene as EditorScene | null, renderStateRef.current);
    // geometry가 바뀌었을 수 있으니 호버 상세용 정점 캐시도 갱신.
    selectedVerticesRef.current = projectSelectedVertices(
      scene as EditorScene | null,
      renderStateRef.current.selectedIds,
    );
    // 이전 상세점이 다음 포인터 이동까지 남지 않도록 즉시 비운다.
    detailLayerRef.current?.getSource()?.clear(true);
    if (vertexLayerRef.current) {
      syncVertexOverlay(
        vertexLayerRef.current,
        scene as EditorScene | null,
        renderStateRef.current.selectedIds,
        readVertexViewInfo(map),
      );
    }
    // 콘텐츠 피처가 새로 만들어졌으므로 편집 대상(Modify 컬렉션)을 다시 바인딩.
    modifyRef.current?.sync(renderStateRef.current.selectedIds);
  }, [scene]);

  // 선택 변경 → 스타일 함수가 읽는 selectedIds 갱신 + 멤버십이 바뀐 피처의 레이어만 무효화 + 정점 오버레이 갱신(scene 재빌드 없음).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    const previous = renderStateRef.current.selectedIds;
    const next = new Set(selectedFeatureIds);

    // 대칭차: 새로 선택되었거나 선택 해제된 id만 모은다.
    const changedIds: string[] = [];
    for (const id of previous) {
      if (!next.has(id)) {
        changedIds.push(id);
      }
    }
    for (const id of next) {
      if (!previous.has(id)) {
        changedIds.push(id);
      }
    }

    // 선택 집합이 실제로 안 바뀌었으면 무효화·정점 재생성 모두 건너뛴다.
    if (changedIds.length === 0) {
      return;
    }

    // renderStateRef 객체는 교체하지 않고 필드만 갱신한다(스타일 함수 클로저가 같은 참조를 읽어야 함).
    renderStateRef.current.selectedIds = next;
    // 호버 상세용 전체 정점 캐시 갱신(선택 바뀔 때만).
    selectedVerticesRef.current = projectSelectedVertices(
      useEditorStore.getState().scene as EditorScene | null,
      next,
    );
    // 이전 선택의 상세점이 다음 포인터 이동까지 남지 않도록 즉시 비운다.
    detailLayerRef.current?.getSource()?.clear(true);
    invalidateFeatureStyles(map, changedIds);
    if (vertexLayerRef.current) {
      syncVertexOverlay(
        vertexLayerRef.current,
        useEditorStore.getState().scene as EditorScene | null,
        next,
        readVertexViewInfo(map),
      );
    }
    // 선택이 바뀌었으니 편집 대상(Modify 컬렉션)도 다시 바인딩.
    modifyRef.current?.sync(next);
  }, [selectedFeatureIds]);

  // 호버 변경 → 강조 대상 피처의 레이어만 무효화(이전/현재 호버 둘 다).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    const previous = renderStateRef.current.hoveredId;
    if (previous === hoveredFeatureId) {
      return;
    }

    renderStateRef.current.hoveredId = hoveredFeatureId;
    const changedIds = [previous, hoveredFeatureId].filter(
      (id): id is string => id !== null,
    );
    invalidateFeatureStyles(map, changedIds);
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
