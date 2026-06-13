import { useEffect, useRef, useState } from "react";
import type OpenLayersMap from "ol/Map";
import { unByKey } from "ol/Observable";
import {
  attachEditAffordance,
  attachEditorSelection,
  attachFeatureTranslate,
  attachVertexDetail,
  attachVertexModify,
  createOpenLayersMap,
  createVertexDetailOverlayLayer,
  createVertexOverlayLayer,
  type EditAffordance,
  centerViewOnFeature,
  type EditorRenderState,
  getFeatureAnchorPixel,
  invalidateFeatureStyles,
  type ProjectedVertex,
  projectSelectedVertices,
  readVertexViewInfo,
  syncOpenLayersMapScene,
  syncVertexOverlay,
} from "@/pages/editor/adapters/openlayers";
import {
  deriveGeometryOpTargets,
  type GeometryOpTargets,
  subtractGeometry,
  unionGeometries,
} from "@/pages/editor/features/geometry-ops";
import { getMapInteractionActivation } from "@/pages/editor/features/map/model/mapInteractionModel";
import {
  deriveSelectionTargets,
  getChangedSelectionIds,
  isToggleSelectionModifier,
  resolveSelection,
} from "@/pages/editor/features/selection";
import { useEditorStore } from "@/pages/editor/state/editorStore";
import {
  isPolygonalGeometry,
  type EditorScene,
  type GeoJsonGeometry,
  type PolygonalGeometry,
} from "@/pages/editor/types/editorTypes";

// 호버 시 커서로부터 이 픽셀 반경 안의 정점을 상세로 드러냅니다(편집 grab 허용보다 크게).
const VERTEX_DETAIL_RADIUS_PX = 28;

// 불리언 연산의 "상대 고르기" 모드. null이면 일반(버튼 노출) 상태입니다.
type GeometryOpPickMode = "merge" | "subtract" | null;

const EMPTY_GEOMETRY_OP_TARGETS: GeometryOpTargets = {
  targetId: null,
  mergeCandidateIds: [],
  subtractCandidateIds: [],
};

// scene에서 피처의 폴리곤 geometry를 찾습니다(폴리곤이 아니면 null). 불리언 연산 입력 조회용.
function getPolygonalGeometryFromScene(
  scene: EditorScene | null,
  featureId: string,
): PolygonalGeometry | null {
  if (!scene) {
    return null;
  }
  for (const layer of scene.layers) {
    for (const feature of layer.features) {
      if (feature.id === featureId) {
        const geometry = feature.feature.geometry as GeoJsonGeometry;
        return isPolygonalGeometry(geometry) ? geometry : null;
      }
    }
  }
  return null;
}

// 병합(union): 두 폴리곤을 합친 결과로 target을 교체하고 other를 제거합니다(store 액션 호출).
function applyMerge(targetId: string, otherId: string) {
  const scene = useEditorStore.getState().scene as EditorScene | null;
  const target = getPolygonalGeometryFromScene(scene, targetId);
  const other = getPolygonalGeometryFromScene(scene, otherId);
  if (!target || !other) {
    return;
  }
  const result = unionGeometries(target, other);
  if (result) {
    useEditorStore.getState().mergeFeatures(targetId, otherId, result);
  }
}

// 제거(difference): target에서 cutter와 겹친 부분을 뺍니다(빈 결과면 store가 target 삭제).
function applySubtract(targetId: string, cutterId: string) {
  const scene = useEditorStore.getState().scene as EditorScene | null;
  const target = getPolygonalGeometryFromScene(scene, targetId);
  const cutter = getPolygonalGeometryFromScene(scene, cutterId);
  if (!target || !cutter) {
    return;
  }
  useEditorStore.getState().subtractFeature(targetId, subtractGeometry(target, cutter));
}

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
  // 정점 편집(정점편집·삽입/삭제·힌트·정점 오버레이) 대상 id. "정확히 1개의 편집 가능 도형"일 때만 채워진다.
  // 다중 선택·읽기전용·잠금·숨김이면 비어 있어 정점 편집 바인딩이 붙지 않는다(하이라이트는 selectedIds 전체).
  const vertexEditTargetIdsRef = useRef<Set<string>>(new Set());
  // 몸통 드래그 이동 대상 id. 선택된 것 중 편집 가능(보임+편집가능+잠금해제)인 도형 "전부"(다중 이동 허용).
  const translateTargetIdsRef = useRef<Set<string>>(new Set());
  // 현재 편집 대상 도형의 전체 투영 정점. 호버 상세에서 커서 반경 질의에 사용합니다.
  const selectedVerticesRef = useRef<ProjectedVertex[]>([]);
  // 정점 편집(Modify) 핸들. 선택 변경/씬 재빌드 때 선택 도형으로 재바인딩합니다.
  const modifyRef = useRef<ReturnType<typeof attachVertexModify> | null>(null);
  // 몸통 드래그 이동(Translate) 핸들. Modify보다 먼저 등록해 정점 히트는 Modify가 가져간다.
  const translateRef = useRef<ReturnType<typeof attachFeatureTranslate> | null>(null);
  // 선택/affordance/상세 핸들. 모드 전환 시 setActive로 켜고 끈다.
  const selectionRef = useRef<ReturnType<typeof attachEditorSelection> | null>(null);
  const affordanceRef = useRef<ReturnType<typeof attachEditAffordance> | null>(null);
  const detailRef = useRef<ReturnType<typeof attachVertexDetail> | null>(null);
  // 외곽선 클릭으로 정점을 추가한 직후 짧은 시간 동안 따라오는 selection 단일클릭을 무시한다(만료 시각, ms).
  const suppressSelectUntilRef = useRef(0);
  // 불리언 연산 후보(병합/제거 대상). 클릭(상대 고르기) 시점에 최신을 읽도록 ref로도 둔다.
  const geometryOpTargetsRef = useRef<GeometryOpTargets>(EMPTY_GEOMETRY_OP_TARGETS);
  // 현재 상대 고르기 모드. 선택 클릭 핸들러가 동기적으로 읽어 클릭을 가로챈다.
  const geometryOpPickModeRef = useRef<GeometryOpPickMode>(null);

  const scene = useEditorStore((state) => state.scene);
  const selectedFeatureIds = useEditorStore((state) => state.selectedFeatureIds);
  const hoveredFeatureId = useEditorStore((state) => state.hoveredFeatureId);
  const activeMode = useEditorStore((state) => state.activeMode);
  const featureFocusRequest = useEditorStore((state) => state.featureFocusRequest);

  // 커서 위치 기준 편집 동작(정점 위=삭제, 외곽선=추가, 그 외=없음). 툴팁 분기에 사용.
  const [editAffordance, setEditAffordance] = useState<EditAffordance>(null);
  // 도형 위 불리언 연산 툴바 상태(EditorPage가 렌더). 앵커 픽셀·가능 연산·상대 고르기 모드.
  const [geometryOpAnchor, setGeometryOpAnchor] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [geometryOpAvailability, setGeometryOpAvailability] = useState<{
    canMerge: boolean;
    canSubtract: boolean;
  }>({ canMerge: false, canSubtract: false });
  const [geometryOpPickMode, setGeometryOpPickMode] =
    useState<GeometryOpPickMode>(null);

  // 상대 고르기 모드를 켠다. ref와 state를 함께 갱신(핸들러는 ref, 렌더는 state).
  const enterGeometryOpPickMode = (mode: "merge" | "subtract") => {
    geometryOpPickModeRef.current = mode;
    setGeometryOpPickMode(mode);
  };
  const cancelGeometryOpPickMode = () => {
    geometryOpPickModeRef.current = null;
    setGeometryOpPickMode(null);
  };

  // 병합 버튼: 항상 상대 고르기 모드로(떨어진 폴리곤도 명시 선택해 합칠 수 있게).
  const handleGeometryOpMerge = () => {
    if (geometryOpTargetsRef.current.mergeCandidateIds.length > 0) {
      enterGeometryOpPickMode("merge");
    }
  };
  // 제거 버튼: 겹친 후보가 정확히 1개면 바로 적용, 여러 개면 상대 고르기 모드로.
  const handleGeometryOpSubtract = () => {
    const { targetId, subtractCandidateIds } = geometryOpTargetsRef.current;
    if (!targetId || subtractCandidateIds.length === 0) {
      return;
    }
    if (subtractCandidateIds.length === 1) {
      applySubtract(targetId, subtractCandidateIds[0]);
      return;
    }
    enterGeometryOpPickMode("subtract");
  };

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

    const selection = attachEditorSelection(map, {
      getScene: () => useEditorStore.getState().scene as EditorScene | null,
      onSelect: (featureId, modifiers) => {
        // 상대 고르기 모드: 클릭을 operand 선택으로 가로챈다(선택 자체는 바꾸지 않음).
        // 후보가 아닌 곳/빈 곳을 클릭하면 모드만 해제(취소)된다.
        const pickMode = geometryOpPickModeRef.current;
        if (pickMode) {
          geometryOpPickModeRef.current = null;
          setGeometryOpPickMode(null);
          const { targetId, mergeCandidateIds, subtractCandidateIds } =
            geometryOpTargetsRef.current;
          if (featureId && targetId && featureId !== targetId) {
            if (pickMode === "merge" && mergeCandidateIds.includes(featureId)) {
              applyMerge(targetId, featureId);
            } else if (
              pickMode === "subtract" &&
              subtractCandidateIds.includes(featureId)
            ) {
              applySubtract(targetId, featureId);
            }
          }
          return;
        }
        // 정점 추가 직후 짧은 시간 내 따라오는 단일클릭은 선택을 흔들지 않도록 무시한다(만료 후 자동 해제).
        if (performance.now() < suppressSelectUntilRef.current) {
          suppressSelectUntilRef.current = 0;
          return;
        }
        // 교체/토글/해제 정책은 순수 함수가 결정한다(Cmd/Ctrl이면 토글, 빈 곳 보조키는 no-op).
        const additive = isToggleSelectionModifier(modifiers);
        const current = useEditorStore.getState().selectedFeatureIds;
        const next = resolveSelection(current, featureId, additive);
        // 같은 참조(보조키+빈 곳)면 store를 건드리지 않는다.
        if (next !== current) {
          useEditorStore.getState().setSelectedFeatureIds([...next]);
        }
      },
      onHover: (featureId) => useEditorStore.getState().setHoveredFeatureId(featureId),
    });

    const detail = attachVertexDetail(map, {
      layer: detailLayer,
      getVertices: () => selectedVerticesRef.current,
      radiusPx: VERTEX_DETAIL_RADIUS_PX,
    });

    // 몸통 드래그 = 도형 통째 이동. Modify보다 "먼저" 추가해야 정점/외곽선은 Modify가 우선 잡는다.
    const translate = attachFeatureTranslate(map, {
      getScene: () => useEditorStore.getState().scene as EditorScene | null,
      onDragStart: () => {
        // 이동 중에는 정점 핸들/상세를 치운다(끝나면 onDragEnd에서 복구).
        vertexLayerRef.current?.getSource()?.clear(true);
        detailLayerRef.current?.getSource()?.clear(true);
      },
      // 한 드래그로 움직인 도형들을 한 커밋(=undo 1단계)으로 묶는다.
      onCommit: (updates) => useEditorStore.getState().updateFeaturesGeometry(updates),
      onDragEnd: () => {
        if (!vertexLayerRef.current) {
          return;
        }
        // 이동이 끝나면 정점 핸들을 복구한다 — 단일 편집 대상일 때만 채워지므로 다중 이동 후엔 자동으로 비워진다.
        syncVertexOverlay(
          vertexLayerRef.current,
          useEditorStore.getState().scene as EditorScene | null,
          vertexEditTargetIdsRef.current,
          readVertexViewInfo(map),
        );
      },
    });
    translateRef.current = translate;

    const modify = attachVertexModify(map, {
      getScene: () => useEditorStore.getState().scene as EditorScene | null,
      onActiveDrag: () => {
        // 실제 정점 드래그가 시작될 때만 핸들을 치운다(기존 정점 드래그 + 삽입 후 이어 드래그 모두).
        // 클릭 추가/우클릭 삭제처럼 드래그 없는 제스처에선 호출되지 않아 깜빡임이 없다.
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
          vertexEditTargetIdsRef.current,
          readVertexViewInfo(map),
        );
      },
    });
    modifyRef.current = modify;

    // 커서가 선택 도형의 정점 위/외곽선/그 외 중 어디인지 판정해 툴팁 분기에 사용.
    const affordance = attachEditAffordance(map, {
      getScene: () => useEditorStore.getState().scene as EditorScene | null,
      // 편집 힌트는 "정점 편집 대상(정확히 1개의 편집 가능 도형)"에 대해서만 — 다중 선택이면 비어 있어 힌트가 없다.
      getSelectedIds: () => Array.from(vertexEditTargetIdsRef.current),
      onChange: setEditAffordance,
    });

    selectionRef.current = selection;
    detailRef.current = detail;
    affordanceRef.current = affordance;

    const moveEndKey = map.on("moveend", () => {
      if (!vertexLayerRef.current) {
        return;
      }
      // 편집 비활성 모드에서는 팬/줌 후에도 정점 핸들을 되살리지 않는다.
      if (
        !getMapInteractionActivation(useEditorStore.getState().activeMode).vertexEdit
      ) {
        return;
      }
      syncVertexOverlay(
        vertexLayerRef.current,
        useEditorStore.getState().scene as EditorScene | null,
        vertexEditTargetIdsRef.current,
        readVertexViewInfo(map),
      );
    });

    // 불리언 연산 툴바 앵커는 팬/줌 후에도 도형 상단 중앙을 따라가야 한다(후보는 그대로, 위치만 갱신).
    const anchorMoveEndKey = map.on("moveend", () => {
      const targetId = geometryOpTargetsRef.current.targetId;
      setGeometryOpAnchor(
        targetId
          ? getFeatureAnchorPixel(
              map,
              useEditorStore.getState().scene as EditorScene | null,
              targetId,
            )
          : null,
      );
    });

    return () => {
      selection.detach();
      detail.detach();
      translate.detach();
      modify.detach();
      affordance.detach();
      unByKey(moveEndKey);
      unByKey(anchorMoveEndKey);
      map.setTarget(undefined);
      mapRef.current = null;
      vertexLayerRef.current = null;
      detailLayerRef.current = null;
      modifyRef.current = null;
      translateRef.current = null;
      selectionRef.current = null;
      affordanceRef.current = null;
      detailRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    // 씬(콘텐츠 레이어) 렌더는 모드와 무관하게 항상 동기화한다.
    syncOpenLayersMapScene(map, scene as EditorScene | null, renderStateRef.current);

    // scene이 바뀌면 편집 대상을 다시 계산한다(편집 가능 여부가 바뀔 수 있음).
    // 정점 편집은 1개일 때만, 몸통 이동은 편집 가능한 선택 전부.
    const { vertexEditTargetIds, translateTargetIds } = deriveSelectionTargets(
      scene,
      renderStateRef.current.selectedIds,
    );
    vertexEditTargetIdsRef.current = vertexEditTargetIds;
    translateTargetIdsRef.current = translateTargetIds;

    // 정점 핸들/편집 바인딩은 편집 활성 모드에서만, 그리고 "정점 편집 대상"에만 갱신한다.
    const editing = getMapInteractionActivation(
      useEditorStore.getState().activeMode,
    ).vertexEdit;
    selectedVerticesRef.current = projectSelectedVertices(
      scene as EditorScene | null,
      vertexEditTargetIds,
    );
    detailLayerRef.current?.getSource()?.clear(true);
    if (editing && vertexLayerRef.current) {
      syncVertexOverlay(
        vertexLayerRef.current,
        scene as EditorScene | null,
        vertexEditTargetIds,
        readVertexViewInfo(map),
      );
    } else {
      vertexLayerRef.current?.getSource()?.clear(true);
    }
    if (editing) {
      modifyRef.current?.sync(vertexEditTargetIds);
      // 몸통 이동은 편집 가능한 선택 전부를 대상으로 한다(다중 이동).
      translateRef.current?.sync(translateTargetIds);
    }
    // scene 변경으로 정점 편집 대상이 사라지면(예: 선택된 도형을 잠금/숨김) 편집 힌트도 즉시 내린다.
    // (선택은 그대로라 selectedFeatureIds 이펙트가 돌지 않으므로 여기서 처리해야 한다.)
    if (vertexEditTargetIds.size === 0) {
      setEditAffordance(null);
    }
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
    // 선택 하이라이트는 "선택 전체"에 대해, 모드와 무관하게 갱신한다(다중 선택 모두 강조).
    invalidateFeatureStyles(map, changedIds);

    // 편집 대상을 다시 계산한다. 정점 편집은 1개일 때만, 몸통 이동은 편집 가능한 선택 전부.
    const currentScene = useEditorStore.getState().scene as EditorScene | null;
    const { vertexEditTargetIds, translateTargetIds } = deriveSelectionTargets(
      currentScene,
      next,
    );
    vertexEditTargetIdsRef.current = vertexEditTargetIds;
    translateTargetIdsRef.current = translateTargetIds;

    // 정점 핸들/편집 바인딩은 편집 활성 모드에서만, 그리고 "정점 편집 대상"에만 갱신한다.
    const editing = getMapInteractionActivation(
      useEditorStore.getState().activeMode,
    ).vertexEdit;
    selectedVerticesRef.current = projectSelectedVertices(
      currentScene,
      vertexEditTargetIds,
    );
    detailLayerRef.current?.getSource()?.clear(true);
    if (editing && vertexLayerRef.current) {
      syncVertexOverlay(
        vertexLayerRef.current,
        currentScene,
        vertexEditTargetIds,
        readVertexViewInfo(map),
      );
    } else {
      vertexLayerRef.current?.getSource()?.clear(true);
    }
    if (editing) {
      modifyRef.current?.sync(vertexEditTargetIds);
      // 몸통 이동은 편집 가능한 선택 전부를 대상으로 한다(다중 이동).
      translateRef.current?.sync(translateTargetIds);
    }
    // 정점 편집 대상이 없으면(0개·다중·잠금 등) 편집 힌트를 즉시 내린다 — 1→2개로 바뀌는 순간 stale 툴팁 방지.
    if (vertexEditTargetIds.size === 0) {
      setEditAffordance(null);
    }
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

  // 패널 등에서 온 "이 도형으로 지도 이동" 요청을 소비한다(요청 번호가 바뀔 때마다 1회).
  // 줌은 유지하고 중심만 옮긴다. 지도 클릭 선택은 요청을 만들지 않으므로 화면이 튀지 않는다.
  // 처리 후 요청을 비워 리마운트 때 같은 요청이 재생되지 않게 한다.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !featureFocusRequest) {
      return;
    }
    centerViewOnFeature(
      map,
      useEditorStore.getState().scene as EditorScene | null,
      featureFocusRequest.featureId,
    );
    useEditorStore.getState().consumeFeatureFocusRequest(featureFocusRequest.requestId);
  }, [featureFocusRequest]);

  // 모드별 interaction 게이팅: Select만 선택/편집/affordance를 켜고, 나머지는 끈다.
  // 선택 상태 자체는 유지하고(하이라이트 보존), 편집 off 시 정점 핸들/상세/힌트만 내린다.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    const activation = getMapInteractionActivation(activeMode);
    selectionRef.current?.setActive(activation.selection);
    modifyRef.current?.setActive(activation.vertexEdit);
    translateRef.current?.setActive(activation.vertexEdit);
    affordanceRef.current?.setActive(activation.affordance);
    detailRef.current?.setActive(activation.vertexEdit);

    // 선택/호버를 멈춘 모드에서는 잔여 호버 하이라이트를 내린다(선택 자체는 유지).
    if (!activation.selection) {
      useEditorStore.getState().setHoveredFeatureId(null);
    }

    if (activation.vertexEdit) {
      // 편집 활성(예: Select 복귀): 정점 편집 대상(1개)으로 핸들을, 이동 대상(선택 전부)으로 Translate를 복구한다.
      const currentScene = useEditorStore.getState().scene as EditorScene | null;
      const { vertexEditTargetIds, translateTargetIds } = deriveSelectionTargets(
        currentScene,
        renderStateRef.current.selectedIds,
      );
      vertexEditTargetIdsRef.current = vertexEditTargetIds;
      translateTargetIdsRef.current = translateTargetIds;
      selectedVerticesRef.current = projectSelectedVertices(
        currentScene,
        vertexEditTargetIds,
      );
      if (vertexLayerRef.current) {
        syncVertexOverlay(
          vertexLayerRef.current,
          currentScene,
          vertexEditTargetIds,
          readVertexViewInfo(map),
        );
      }
      modifyRef.current?.sync(vertexEditTargetIds);
      translateRef.current?.sync(translateTargetIds);
    } else {
      // 편집 비활성: 정점/상세 오버레이와 힌트를 즉시 내린다.
      vertexLayerRef.current?.getSource()?.clear(true);
      detailLayerRef.current?.getSource()?.clear(true);
      setEditAffordance(null);
    }
  }, [activeMode]);

  // 도형 위 불리언 연산 툴바: 단일 폴리곤 선택 시 병합/제거 후보를 도출하고 앵커를 잡는다.
  // 선택/scene/모드가 바뀔 때마다 재계산한다(앵커의 팬·줌 추적은 moveend가 담당).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    // 선택 모드가 아니면 툴바를 숨기고 상대 고르기 모드를 해제한다.
    if (!getMapInteractionActivation(activeMode).selection) {
      geometryOpTargetsRef.current = EMPTY_GEOMETRY_OP_TARGETS;
      setGeometryOpAvailability({ canMerge: false, canSubtract: false });
      setGeometryOpAnchor(null);
      geometryOpPickModeRef.current = null;
      setGeometryOpPickMode(null);
      return;
    }

    const currentScene = scene as EditorScene | null;
    const targets = deriveGeometryOpTargets(currentScene, new Set(selectedFeatureIds));
    geometryOpTargetsRef.current = targets;
    setGeometryOpAvailability({
      canMerge: targets.mergeCandidateIds.length > 0,
      canSubtract: targets.subtractCandidateIds.length > 0,
    });
    setGeometryOpAnchor(
      targets.targetId
        ? getFeatureAnchorPixel(map, currentScene, targets.targetId)
        : null,
    );
    // 대상이 사라지면(선택 해제·다중·비폴리곤) 상대 고르기 모드도 해제한다.
    if (!targets.targetId) {
      geometryOpPickModeRef.current = null;
      setGeometryOpPickMode(null);
    }
  }, [scene, selectedFeatureIds, activeMode]);

  // 상대 고르기 모드에서 Esc로 취소한다.
  useEffect(() => {
    if (!geometryOpPickMode) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        geometryOpPickModeRef.current = null;
        setGeometryOpPickMode(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [geometryOpPickMode]);

  return {
    mapElementRef,
    editAffordance,
    geometryOp: {
      anchor: geometryOpAnchor,
      canMerge: geometryOpAvailability.canMerge,
      canSubtract: geometryOpAvailability.canSubtract,
      pickMode: geometryOpPickMode,
      onMerge: handleGeometryOpMerge,
      onSubtract: handleGeometryOpSubtract,
      onCancelPick: cancelGeometryOpPickMode,
    },
  };
}
