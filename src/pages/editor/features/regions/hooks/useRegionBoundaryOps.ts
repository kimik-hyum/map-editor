import { useQueryClient } from "@tanstack/react-query";
import { useBoundaryAccess } from "@/features/auth";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  attachRegionBoundaryOverlays,
  type RegionBoundaryOverlay,
  type RegionBoundaryLayer,
} from "@/pages/editor/adapters/openlayers";
import {
  createGeometryOverlapCache,
  findGeometryOpTarget,
  subtractGeometry,
  unionGeometries,
} from "@/pages/editor/features/geometry-ops";
import { useEditorStore } from "@/pages/editor/state/editorStore";
import {
  isPolygonalGeometry,
  type DeepReadonly,
  type EditorScene,
  type GeoJsonGeometry,
  type PolygonalGeometry,
} from "@/pages/editor/types/editorTypes";
import type OpenLayersMap from "ol/Map";
import { createRegionOriginalSource } from "../api/regionOriginalSource";
import {
  fetchBoundaryOperationGeometry,
  type BoundaryOriginalSource,
} from "../api/boundaryOriginalSource";

type RegionOpHandle = {
  featureId: string;
  element: HTMLElement;
  name: string;
  canSubtract: boolean;
  overlapError: boolean;
  primaryAction: "create" | "merge";
  showSubtract: boolean;
  disabled: boolean;
  zoom: number;
};

type BoundaryMetadata = {
  boundaryId: string | number;
  name: string;
};

type RegionOperationContext = {
  sessionId: string | null;
  scene: DeepReadonly<EditorScene>;
  selectedFeatureIds: readonly string[];
  targetId: string | null;
};

type UseRegionBoundaryOpsArgs = {
  map: OpenLayersMap | null;
  layer: RegionBoundaryLayer | null;
  // 경계 도구가 활성이고 host scene이 준비됐을 때만 +/- 칩을 켭니다.
  enabled: boolean;
  // 같은 layer를 재사용해도 경계 종류가 바뀌면 카드와 진행 중 연산을 폐기합니다.
  scopeKey: string | null;
  originalSource?: BoundaryOriginalSource | null;
};

// scene에서 폴리곤 geometry 조회(편집 대상의 면 가져오기).
function polygonGeomFromScene(
  scene: DeepReadonly<EditorScene> | null,
  featureId: string,
): PolygonalGeometry | null {
  if (!scene) {
    return null;
  }
  for (const sceneLayer of scene.layers) {
    for (const feature of sceneLayer.features) {
      if (feature.id === featureId) {
        const geometry = feature.feature.geometry as GeoJsonGeometry;
        return isPolygonalGeometry(geometry) ? geometry : null;
      }
    }
  }
  return null;
}

// 현재 선택이 "정확히 1개의 편집 가능 폴리곤"이면 그 id를, 아니면 null을 돌려줍니다.
function currentTargetId(): string | null {
  const { scene, selectedFeatureIds } = useEditorStore.getState();
  return findGeometryOpTarget(scene, new Set(selectedFeatureIds))?.id ?? null;
}

function captureOperationContext(): RegionOperationContext | null {
  const { sessionId, scene, selectedFeatureIds } = useEditorStore.getState();
  if (!scene) {
    return null;
  }
  return {
    sessionId,
    scene,
    selectedFeatureIds,
    targetId: findGeometryOpTarget(scene, new Set(selectedFeatureIds))?.id ?? null,
  };
}

// 원본 조회 중 INIT/undo/잠금/선택 변경이 있었다면, 이전 화면에서 시작한 결과를 버립니다.
function isOperationContextCurrent(context: RegionOperationContext): boolean {
  const { sessionId, scene, selectedFeatureIds } = useEditorStore.getState();
  return (
    sessionId === context.sessionId &&
    scene === context.scene &&
    selectedFeatureIds === context.selectedFeatureIds &&
    currentTargetId() === context.targetId
  );
}

// 경계 구역의 상시 작업 카드를 붙입니다. OpenLayers 배치/overlay 수명은 adapter가 담당하고,
// 이 훅은 편집 정책과 원본 geometry fetch만 결정합니다.
export function useRegionBoundaryOps({
  map,
  layer,
  enabled,
  scopeKey,
  originalSource,
}: UseRegionBoundaryOpsArgs) {
  const access = useBoundaryAccess();
  const allowed = !!originalSource || access.allowed;
  const subject = originalSource?.scope ?? access.subject;
  const scene = useEditorStore((state) => state.scene);
  const sessionId = useEditorStore((state) => state.sessionId);
  const selectedFeatureIds = useEditorStore((state) => state.selectedFeatureIds);
  const [visibleBoundaries, setVisibleBoundaries] = useState<RegionBoundaryOverlay[]>(
    [],
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const queryClient = useQueryClient();
  const source = useMemo(
    () =>
      originalSource ??
      (access.subject ? createRegionOriginalSource(queryClient, access.subject) : null),
    [originalSource, queryClient, access.subject],
  );
  const boundaryByFeatureIdRef = useRef(new Map<string, BoundaryMetadata>());
  const busyRef = useRef(false);
  const operationGenerationRef = useRef(0);
  const operationController = useRef<AbortController | null>(null);
  const [overlapCache] = useState(createGeometryOverlapCache);
  const target = useMemo(
    () => findGeometryOpTarget(scene, new Set(selectedFeatureIds)),
    [scene, selectedFeatureIds],
  );

  // 버튼 위치/줌/정렬은 표시만 갱신합니다. 새 도형 쌍만 최초 검사하고,
  // 이미 본 쌍은 선택 해제·복귀나 타일 재생성 이후에도 좌표가 같으면 판정을 재사용합니다.
  const chips = useMemo<RegionOpHandle[]>(() => {
    if (!allowed || !enabled) {
      return [];
    }
    return visibleBoundaries.map((boundary) => {
      const cached = source?.getCachedGeometry(boundary.boundaryId);
      const geometry =
        cached && isPolygonalGeometry(cached) ? cached : boundary.displayGeometry;
      const overlap = target
        ? overlapCache.checkOverlap(target.geometry, geometry)
        : "disjoint";
      return {
        featureId: boundary.featureId,
        element: boundary.element,
        name: boundary.name,
        canSubtract: overlap === "overlap",
        overlapError: overlap === "error",
        primaryAction: target ? "merge" : "create",
        showSubtract: true,
        disabled: busy,
        zoom: boundary.zoom,
      };
    });
  }, [allowed, enabled, visibleBoundaries, target, overlapCache, busy, source]);

  useEffect(() => {
    operationController.current?.abort();
    operationGenerationRef.current += 1;
    busyRef.current = false;
    setBusy(false);
    boundaryByFeatureIdRef.current.clear();
    setVisibleBoundaries([]);
    setError(null);

    if (!map || !layer || !enabled || !scopeKey || !allowed || !subject) {
      return;
    }

    const attachment = attachRegionBoundaryOverlays(map, layer, (boundaries) => {
      if (useEditorStore.getState().sessionId !== sessionId) {
        return;
      }
      boundaryByFeatureIdRef.current.clear();
      for (const { featureId, boundaryId, name } of boundaries) {
        boundaryByFeatureIdRef.current.set(featureId, { boundaryId, name });
      }
      setVisibleBoundaries(boundaries);
    });

    return () => {
      operationController.current?.abort();
      operationGenerationRef.current += 1;
      busyRef.current = false;
      attachment.detach();
      boundaryByFeatureIdRef.current.clear();
    };
  }, [map, layer, enabled, scopeKey, sessionId, allowed, subject]);

  const onMerge = useCallback(
    async (featureId: string) => {
      if (busyRef.current || !allowed || !source || !enabled) {
        return;
      }
      const boundary = boundaryByFeatureIdRef.current.get(featureId);
      if (!boundary) {
        return;
      }

      const context = captureOperationContext();
      if (!context) {
        return;
      }
      const operationGeneration = operationGenerationRef.current + 1;
      operationGenerationRef.current = operationGeneration;
      busyRef.current = true;
      setBusy(true);
      setError(null);
      const controller = new AbortController();
      operationController.current = controller;
      try {
        const boundaryGeom = await fetchBoundaryOperationGeometry(
          source,
          boundary.boundaryId,
          controller.signal,
        );
        if (
          operationGeneration !== operationGenerationRef.current ||
          !isOperationContextCurrent(context)
        ) {
          return;
        }
        const store = useEditorStore.getState();
        if (!store.scene) {
          throw new Error("호스트 scene이 준비되지 않았습니다.");
        }

        if (context.targetId) {
          const targetGeom = polygonGeomFromScene(store.scene, context.targetId);
          if (!targetGeom) {
            throw new Error("선택한 편집 도형을 찾을 수 없습니다.");
          }
          const result = unionGeometries(targetGeom, boundaryGeom);
          if (!result) {
            throw new Error("경계 병합 결과를 만들 수 없습니다.");
          }
          store.updateFeatureGeometry(context.targetId, result);
          return;
        }

        store.addFeatures([{ geometry: boundaryGeom, name: boundary.name }]);
      } catch {
        if (
          operationGeneration === operationGenerationRef.current &&
          isOperationContextCurrent(context)
        ) {
          setError("경계 원본을 가져오거나 병합하지 못했습니다. 다시 시도해주세요.");
        }
      } finally {
        if (operationGeneration === operationGenerationRef.current) {
          busyRef.current = false;
          setBusy(false);
        }
      }
    },
    [allowed, enabled, source],
  );

  const onSubtract = useCallback(
    async (featureId: string) => {
      if (busyRef.current || !allowed || !source || !enabled) {
        return;
      }
      const boundary = boundaryByFeatureIdRef.current.get(featureId);
      const context = captureOperationContext();
      if (!boundary || !context?.targetId) {
        return;
      }

      const operationGeneration = operationGenerationRef.current + 1;
      operationGenerationRef.current = operationGeneration;
      busyRef.current = true;
      setBusy(true);
      setError(null);
      const controller = new AbortController();
      operationController.current = controller;
      try {
        const boundaryGeom = await fetchBoundaryOperationGeometry(
          source,
          boundary.boundaryId,
          controller.signal,
        );
        if (
          operationGeneration !== operationGenerationRef.current ||
          !isOperationContextCurrent(context)
        ) {
          return;
        }
        const store = useEditorStore.getState();
        if (!store.scene) {
          throw new Error("호스트 scene이 준비되지 않았습니다.");
        }
        const targetGeom = polygonGeomFromScene(store.scene, context.targetId);
        if (!targetGeom) {
          throw new Error("선택한 편집 도형을 찾을 수 없습니다.");
        }
        const result = subtractGeometry(targetGeom, boundaryGeom);
        if (result === undefined) {
          throw new Error("경계 제거 결과를 만들 수 없습니다.");
        }
        store.subtractFeature(context.targetId, result);
      } catch {
        if (
          operationGeneration === operationGenerationRef.current &&
          isOperationContextCurrent(context)
        ) {
          setError("경계 원본을 가져오거나 제거하지 못했습니다. 다시 시도해주세요.");
        }
      } finally {
        if (operationGeneration === operationGenerationRef.current) {
          busyRef.current = false;
          setBusy(false);
        }
      }
    },
    [allowed, enabled, source],
  );

  return { overlays: chips, onMerge, onSubtract, error, busy };
}
