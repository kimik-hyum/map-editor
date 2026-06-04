import { useEffect, useRef } from "react";
import type OpenLayersMap from "ol/Map";
import { unByKey } from "ol/Observable";
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
  readVertexViewInfo,
  syncOpenLayersMapScene,
  syncVertexOverlay,
} from "@/pages/editor/adapters/openlayers";
import { getChangedSelectionIds } from "@/pages/editor/features/selection";
import { useEditorStore } from "@/pages/editor/state/editorStore";
import type { EditorScene } from "@/pages/editor/types/editorTypes";

// 호버 시 커서로부터 이 픽셀 반경 안의 정점을 상세로 드러냅니다(편집 grab 허용보다 크게).
const VERTEX_DETAIL_RADIUS_PX = 28;

export function useOpenLayersEditorMap() {
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
  // 외곽선 클릭으로 정점을 추가한 직후 짧은 시간 동안 따라오는 selection 단일클릭을 무시한다(만료 시각, ms).
  const suppressSelectUntilRef = useRef(0);

  const scene = useEditorStore((state) => state.scene);
  const selectedFeatureIds = useEditorStore((state) => state.selectedFeatureIds);
  const hoveredFeatureId = useEditorStore((state) => state.hoveredFeatureId);

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
      onSelect: (featureIds) => {
        // 정점 추가 직후 짧은 시간 내 따라오는 단일클릭은 선택을 흔들지 않도록 무시한다(만료 후 자동 해제).
        if (performance.now() < suppressSelectUntilRef.current) {
          suppressSelectUntilRef.current = 0;
          return;
        }
        useEditorStore.getState().setSelectedFeatureIds(featureIds);
      },
      onHover: (featureId) => useEditorStore.getState().setHoveredFeatureId(featureId),
    });

    const detachDetail = attachVertexDetail(map, {
      layer: detailLayer,
      getVertices: () => selectedVerticesRef.current,
      radiusPx: VERTEX_DETAIL_RADIUS_PX,
    });

    const modify = attachVertexModify(map, {
      getScene: () => useEditorStore.getState().scene as EditorScene | null,
      onModifyStart: () => {
        vertexLayerRef.current?.getSource()?.clear(true);
        detailLayerRef.current?.getSource()?.clear(true);
      },
      onCommit: (featureId, geometry) =>
        useEditorStore.getState().updateFeatureGeometry(featureId, geometry),
      onInsert: () => {
        suppressSelectUntilRef.current = performance.now() + 300;
      },
      onModifyEnd: () => {
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

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    syncOpenLayersMapScene(map, scene as EditorScene | null, renderStateRef.current);
    selectedVerticesRef.current = projectSelectedVertices(
      scene as EditorScene | null,
      renderStateRef.current.selectedIds,
    );
    detailLayerRef.current?.getSource()?.clear(true);
    if (vertexLayerRef.current) {
      syncVertexOverlay(
        vertexLayerRef.current,
        scene as EditorScene | null,
        renderStateRef.current.selectedIds,
        readVertexViewInfo(map),
      );
    }
    modifyRef.current?.sync(renderStateRef.current.selectedIds);
  }, [scene]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    const previous = renderStateRef.current.selectedIds;
    const next = new Set(selectedFeatureIds);
    const changedIds = getChangedSelectionIds(previous, next);
    if (changedIds.length === 0) {
      return;
    }

    renderStateRef.current.selectedIds = next;
    selectedVerticesRef.current = projectSelectedVertices(
      useEditorStore.getState().scene as EditorScene | null,
      next,
    );
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
    modifyRef.current?.sync(next);
  }, [selectedFeatureIds]);

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

  // 선택된 도형 위에 커서가 있으면 편집 힌트(정점 추가/삭제) 툴팁을 띄울지 결정합니다.
  const editingHintActive =
    hoveredFeatureId !== null && selectedFeatureIds.includes(hoveredFeatureId);

  return { mapElementRef, editingHintActive };
}
