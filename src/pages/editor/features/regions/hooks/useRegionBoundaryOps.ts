import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  attachRegionBoundaryHover,
  type RegionBoundaryLayer,
} from "@/pages/editor/adapters/openlayers";
import {
  deriveGeometryOpTargets,
  hasAreaOverlap,
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
import { fetchRegionById } from "../api/regionsApi";
import { REGION_BOUNDARY_CACHE_MS } from "../model/regionQueryPolicy";

type RegionOpHandle = {
  featureId: string;
  element: HTMLElement;
  name: string;
  canSubtract: boolean;
};

type BoundaryMetadata = {
  boundaryId: string | number;
  name: string;
};

type HoveredBoundary = BoundaryMetadata & {
  featureId: string;
  element: HTMLElement;
  displayGeometry: PolygonalGeometry;
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
  // 같은 layer를 재사용해도 경계 종류가 바뀌면 hover와 진행 중 연산을 폐기합니다.
  scopeKey: string | null;
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

async function fullResBoundaryGeom(
  queryClient: QueryClient,
  boundaryId: string | number,
): Promise<PolygonalGeometry> {
  const full = await queryClient.fetchQuery({
    queryKey: ["region-full", String(boundaryId)],
    queryFn: ({ signal }) => fetchRegionById(boundaryId, signal),
    staleTime: REGION_BOUNDARY_CACHE_MS,
    gcTime: REGION_BOUNDARY_CACHE_MS,
  });
  const geometry = full?.geometry as GeoJsonGeometry | undefined;
  if (!geometry || !isPolygonalGeometry(geometry)) {
    throw new Error("경계 원본 geometry가 없습니다.");
  }
  return geometry;
}

// 현재 선택이 "정확히 1개의 편집 가능 폴리곤"이면 그 id를, 아니면 null을 돌려줍니다.
function currentTargetId(): string | null {
  const { scene, selectedFeatureIds } = useEditorStore.getState();
  return deriveGeometryOpTargets(scene, new Set(selectedFeatureIds)).targetId;
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
    targetId: deriveGeometryOpTargets(scene, new Set(selectedFeatureIds)).targetId,
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

// 경계 구역에 +/- 칩을 붙입니다. OpenLayers hover/overlay 수명은 adapter가 담당하고,
// 이 훅은 편집 정책과 원본 geometry fetch만 결정합니다.
export function useRegionBoundaryOps({
  map,
  layer,
  enabled,
  scopeKey,
}: UseRegionBoundaryOpsArgs) {
  const scene = useEditorStore((state) => state.scene);
  const selectedFeatureIds = useEditorStore((state) => state.selectedFeatureIds);
  const [hoveredBoundary, setHoveredBoundary] = useState<HoveredBoundary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const boundaryByFeatureIdRef = useRef(new Map<string, BoundaryMetadata>());
  const busyRef = useRef(false);
  const operationGenerationRef = useRef(0);

  // hover 위치는 adapter가 유지하고, 제거 가능 여부는 현재 scene·선택으로 매번 다시 계산합니다.
  const chip = useMemo<RegionOpHandle | null>(() => {
    if (!hoveredBoundary) {
      return null;
    }
    const targetId = deriveGeometryOpTargets(
      scene,
      new Set(selectedFeatureIds),
    ).targetId;
    const targetGeom = targetId ? polygonGeomFromScene(scene, targetId) : null;
    return {
      featureId: hoveredBoundary.featureId,
      element: hoveredBoundary.element,
      name: hoveredBoundary.name,
      canSubtract: Boolean(
        targetGeom && hasAreaOverlap(targetGeom, hoveredBoundary.displayGeometry),
      ),
    };
  }, [hoveredBoundary, scene, selectedFeatureIds]);

  useEffect(() => {
    operationGenerationRef.current += 1;
    busyRef.current = false;
    boundaryByFeatureIdRef.current.clear();
    setHoveredBoundary(null);
    setError(null);

    if (!map || !layer || !enabled || !scopeKey) {
      return;
    }

    const attachment = attachRegionBoundaryHover(map, layer, {
      onHover: ({ featureId, boundaryId, element, name, displayGeometry }) => {
        boundaryByFeatureIdRef.current.set(featureId, { boundaryId, name });
        setHoveredBoundary({
          featureId,
          boundaryId,
          element,
          name,
          displayGeometry,
        });
      },
      onClear: () => setHoveredBoundary(null),
    });

    return () => {
      operationGenerationRef.current += 1;
      busyRef.current = false;
      attachment.detach();
      boundaryByFeatureIdRef.current.clear();
    };
  }, [map, layer, enabled, scopeKey]);

  const onMerge = useCallback(
    async (featureId: string) => {
      if (busyRef.current) {
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
      setError(null);
      try {
        const boundaryGeom = await fullResBoundaryGeom(
          queryClient,
          boundary.boundaryId,
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
        }
      }
    },
    [queryClient],
  );

  const onSubtract = useCallback(
    async (featureId: string) => {
      if (busyRef.current) {
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
      setError(null);
      try {
        const boundaryGeom = await fullResBoundaryGeom(
          queryClient,
          boundary.boundaryId,
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
        }
      }
    },
    [queryClient],
  );

  return { overlays: chip ? [chip] : [], onMerge, onSubtract, error };
}
