import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type OpenLayersMap from "ol/Map";
import { attachRadiusPreview } from "@/pages/editor/adapters/openlayers";
import { getToolActivation } from "@/pages/editor/features/modes";
import { useEditorStore } from "@/pages/editor/state/editorStore";
import { EditorMode, type EditorScene } from "@/pages/editor/types/editorTypes";
import {
  createRadiusCircleGeometry,
  DEFAULT_RADIUS_KM,
  resolveRadiusTarget,
  validateRadiusInput,
} from "../model/radiusToolModel";

export function useRadiusTool(map: OpenLayersMap | null) {
  const previewRef = useRef<ReturnType<typeof attachRadiusPreview> | null>(null);
  const activeMode = useEditorStore((state) => state.activeMode);
  const scene = useEditorStore((state) => state.scene);
  const selectedFeatureIds = useEditorStore((state) => state.selectedFeatureIds);
  const [draft, setDraft] = useState(DEFAULT_RADIUS_KM);
  const [popupOpen, setPopupOpen] = useState(false);

  const targetResult = useMemo(
    () => resolveRadiusTarget(scene, selectedFeatureIds),
    [scene, selectedFeatureIds],
  );
  const validation = useMemo(() => validateRadiusInput(draft), [draft]);
  const radiusActive = getToolActivation(activeMode).radius;
  const targetFeatureId = targetResult.target?.featureId ?? null;

  const previewGeometry = useMemo(() => {
    if (!radiusActive || !popupOpen || !targetResult.target || !validation.valid) {
      return null;
    }
    return createRadiusCircleGeometry(targetResult.target.center, validation.valueKm);
  }, [popupOpen, radiusActive, targetResult.target, validation]);

  useEffect(() => {
    if (!map) {
      return;
    }
    const preview = attachRadiusPreview(map);
    previewRef.current = preview;
    return () => {
      preview.detach();
      previewRef.current = null;
    };
  }, [map]);

  useEffect(() => {
    previewRef.current?.sync(previewGeometry);
  }, [previewGeometry]);

  // 반경 도구 진입 시 이미 마커가 선택돼 있으면 즉시 입력을 열고, 선택되지 않았다면
  // 지도/레이어 선택을 기다립니다. 새 마커가 확정될 때마다 기본값으로 새 작업을 시작합니다.
  useEffect(() => {
    if (!radiusActive) {
      setPopupOpen(false);
      return;
    }
    if (!targetFeatureId) {
      setPopupOpen(false);
      return;
    }
    setDraft(DEFAULT_RADIUS_KM);
    setPopupOpen(true);
  }, [radiusActive, targetFeatureId]);

  const openInput = useCallback(() => {
    const current = useEditorStore.getState();
    const result = resolveRadiusTarget(
      current.scene as EditorScene | null,
      current.selectedFeatureIds,
    );
    if (result.target) {
      setDraft(DEFAULT_RADIUS_KM);
      setPopupOpen(true);
    }
  }, []);

  const cancel = useCallback(() => {
    setPopupOpen(false);
    useEditorStore.getState().setActiveMode(EditorMode.Select);
  }, []);

  const apply = useCallback(() => {
    const current = useEditorStore.getState();
    const currentTarget = resolveRadiusTarget(
      current.scene as EditorScene | null,
      current.selectedFeatureIds,
    );
    const currentValidation = validateRadiusInput(draft);
    if (!currentTarget.target || !currentValidation.valid) {
      return false;
    }

    const geometry = createRadiusCircleGeometry(
      currentTarget.target.center,
      currentValidation.valueKm,
    );
    current.addFeatures([
      {
        name: `반경 ${currentValidation.label} km`,
        geometry,
        properties: {
          label: `반경 ${currentValidation.label} km`,
          radiusKm: currentValidation.valueKm,
          radiusSourceFeatureId: currentTarget.target.featureId,
        },
      },
    ]);
    useEditorStore.getState().setActiveMode(EditorMode.Select);
    setPopupOpen(false);
    return true;
  }, [draft]);

  const onOpenChange = useCallback(
    (open: boolean) => {
      if (open) {
        openInput();
      } else if (radiusActive) {
        cancel();
      } else {
        setPopupOpen(false);
      }
    },
    [cancel, openInput, radiusActive],
  );

  return {
    popupOpen,
    draft,
    setDraft,
    target: targetResult.target,
    error: validation.error,
    canApply:
      radiusActive && popupOpen && targetResult.target !== null && validation.valid,
    hint: radiusActive && targetResult.target === null ? targetResult.error : null,
    openInput,
    onOpenChange,
    cancel,
    apply,
  };
}

export type RadiusToolController = ReturnType<typeof useRadiusTool>;
