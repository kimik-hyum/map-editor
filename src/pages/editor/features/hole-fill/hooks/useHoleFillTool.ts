import type OpenLayersMap from "ol/Map";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { attachHoleFillPreview } from "@/pages/editor/adapters/openlayers/attachHoleFillPreview";
import { useEditorStore } from "@/pages/editor/state/editorStore";
import { EditorMode } from "@/pages/editor/types/editorTypes";
import {
  DEFAULT_HOLE_AREA_SQUARE_METERS,
  fillSmallPolygonHoles,
  getHoleFillDisabledReason,
  inspectPolygonHoles,
} from "../model/holeFillModel";

type EditorSnapshot = ReturnType<typeof useEditorStore.getState>;
type HoleFillSession = {
  featureId: string;
  name: string;
  snapshot: EditorSnapshot;
  anchor: HTMLButtonElement;
};

function isCurrentSession(session: HoleFillSession, state: EditorSnapshot) {
  return (
    session.snapshot.scene === state.scene &&
    session.snapshot.sessionId === state.sessionId &&
    session.snapshot.activeMode === state.activeMode &&
    state.renamingFeatureId === null &&
    state.selectedFeatureIds.length === 1 &&
    state.selectedFeatureIds[0] === session.featureId
  );
}

export function useHoleFillTool(map: OpenLayersMap | null, busyReason: string | null) {
  const scene = useEditorStore((state) => state.scene);
  const activeMode = useEditorStore((state) => state.activeMode);
  const [session, setSession] = useState<HoleFillSession | null>(null);
  const [areaInput, setAreaInput] = useState(String(DEFAULT_HOLE_AREA_SQUARE_METERS));
  const anchorRef = useRef<HTMLButtonElement | null>(null);
  const modeReason =
    activeMode === EditorMode.Draw || activeMode === EditorMode.Radius
      ? "선택 또는 경계 도구에서 사용할 수 있습니다"
      : null;
  const blockedReason = busyReason ?? modeReason;
  const availability = useMemo(
    () =>
      new Map(
        scene?.layers.flatMap((layer) =>
          layer.features.map(
            (feature) =>
              [feature.id, getHoleFillDisabledReason(layer, feature)] as const,
          ),
        ),
      ),
    [scene],
  );

  const close = useCallback(() => setSession(null), []);
  // 부모의 새 INIT, undo, 잠금/숨김, 다른 도형 선택 등은 즉시 preview를 폐기합니다.
  useEffect(() => {
    if (!session) return;
    const check = (state: EditorSnapshot) => {
      if (!isCurrentSession(session, state)) close();
    };
    check(useEditorStore.getState());
    return useEditorStore.subscribe(check);
  }, [session, close]);
  useEffect(() => {
    if (blockedReason) close();
  }, [blockedReason, close]);

  const target = session?.snapshot.scene?.layers
    .flatMap((layer) => layer.features)
    .find((feature) => feature.id === session.featureId);
  const geometry = target?.feature.geometry;
  const holes = useMemo(
    () => (geometry ? (inspectPolygonHoles(geometry) ?? []) : []),
    [geometry],
  );
  const maxArea = Number(areaInput);
  const validArea = areaInput.trim() !== "" && Number.isFinite(maxArea) && maxArea > 0;
  const candidateCount = validArea
    ? holes.filter((hole) => hole.areaSquareMeters <= maxArea).length
    : 0;
  const preview = useMemo(
    () => (geometry && validArea ? fillSmallPolygonHoles(geometry, maxArea) : null),
    [geometry, validArea, maxArea],
  );

  useEffect(() => {
    if (!map || !session || !isCurrentSession(session, useEditorStore.getState()))
      return;
    const adapter = attachHoleFillPreview(map);
    adapter.sync(preview?.addedGeometry ?? null);
    return adapter.detach;
  }, [map, session, preview]);

  const getDisabledReason = (featureId: string) =>
    blockedReason ??
    (session && session.featureId !== featureId
      ? "빈 공간 채우기를 먼저 완료하거나 취소하세요"
      : null) ??
    availability.get(featureId) ??
    (availability.has(featureId) ? null : "도형을 불러오는 중입니다");

  const open = (featureId: string, name: string, anchor: HTMLButtonElement) => {
    if (getDisabledReason(featureId) !== null || session) return;
    const state = useEditorStore.getState();
    const layer = state.scene?.layers.find((item) =>
      item.features.some((feature) => feature.id === featureId),
    );
    const feature = layer?.features.find((item) => item.id === featureId);
    if (!layer || !feature || getHoleFillDisabledReason(layer, feature) !== null)
      return;
    state.setSelectedFeatureIds([featureId]);
    state.requestFeatureFocus(featureId);
    setAreaInput(String(DEFAULT_HOLE_AREA_SQUARE_METERS));
    anchorRef.current = anchor;
    setSession({ featureId, name, anchor, snapshot: useEditorStore.getState() });
  };

  const apply = () => {
    if (
      !session ||
      !preview ||
      blockedReason ||
      !isCurrentSession(session, useEditorStore.getState())
    ) {
      close();
      return;
    }
    // 미리보기와 동일한 결과만 한 번 커밋해 Undo 한 번으로 원본을 복원합니다.
    useEditorStore
      .getState()
      .updateFeatureGeometry(session.featureId, preview.geometry);
    close();
  };

  return {
    session,
    anchorRef,
    areaInput,
    setAreaInput,
    preview,
    totalHoleCount: holes.length,
    error: !validArea
      ? "0보다 큰 유한한 면적을 입력하세요."
      : candidateCount > 0 && !preview
        ? "안전하게 채울 수 없는 도형입니다. 경계를 확인하세요."
        : null,
    getDisabledReason,
    open,
    close,
    apply,
    isOpen: session !== null,
    isInProgress: useCallback(() => session !== null, [session]),
  };
}

export type HoleFillTool = ReturnType<typeof useHoleFillTool>;
