import { useCallback, useEffect, useRef, useState } from "react";
import type OpenLayersMap from "ol/Map";
import {
  attachFeatureDraw,
  EMPTY_DRAW_SKETCH_STATE,
  type DrawSketchState,
} from "@/pages/editor/adapters/openlayers";
import { getToolActivation } from "@/pages/editor/features/modes";
import { useEditorStore } from "@/pages/editor/state/editorStore";
import { isTextEntryTarget } from "@/pages/editor/state/isTextEntryTarget";
import { GeometryKind } from "@/pages/editor/types/editorTypes";
import {
  confirmDialog,
  isConfirmationDialogOpen,
} from "@/shared/ui/confirmation-dialog";
import { resolveDrawCursor } from "../model/drawCursorModel";
import { resolveDrawHint, resolveDrawKeyboardIntent } from "../model/drawToolModel";

function isInteractiveControlTarget(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    target.closest("button, a, [role='dialog'], [role='alertdialog']") !== null
  );
}

export function useDrawTool(map: OpenLayersMap | null) {
  const handleRef = useRef<ReturnType<typeof attachFeatureDraw> | null>(null);
  const sketchRef = useRef<DrawSketchState>(EMPTY_DRAW_SKETCH_STATE);
  const focusRestoreFrameRef = useRef<number | null>(null);
  const activeMode = useEditorStore((state) => state.activeMode);
  const activeDrawShape = useEditorStore((state) => state.activeDrawShape);
  const sceneReady = useEditorStore((state) => state.scene !== null);
  const [sketch, setSketch] = useState<DrawSketchState>(EMPTY_DRAW_SKETCH_STATE);
  const keyboardTargetingRef = useRef(false);
  const [keyboardTargetingActive, setKeyboardTargetingActive] = useState(false);

  const setKeyboardTargetingMode = useCallback((active: boolean) => {
    keyboardTargetingRef.current = active;
    setKeyboardTargetingActive(active);
  }, []);

  const cancelFocusRestore = useCallback(() => {
    if (focusRestoreFrameRef.current !== null) {
      cancelAnimationFrame(focusRestoreFrameRef.current);
      focusRestoreFrameRef.current = null;
    }
  }, []);

  useEffect(() => cancelFocusRestore, [cancelFocusRestore]);

  useEffect(() => {
    if (!map) {
      return;
    }

    const handle = attachFeatureDraw(map, {
      shape: useEditorStore.getState().activeDrawShape,
      onCommit: (geometry) => {
        setKeyboardTargetingMode(false);
        useEditorStore.getState().addFeatures([{ geometry }]);
      },
      onStateChange: (nextSketch) => {
        sketchRef.current = nextSketch;
        setSketch(nextSketch);
      },
    });
    handleRef.current = handle;

    const state = useEditorStore.getState();
    handle.setActive(getToolActivation(state.activeMode).draw && state.scene !== null);

    return () => {
      cancelFocusRestore();
      handle.detach();
      handleRef.current = null;
      sketchRef.current = EMPTY_DRAW_SKETCH_STATE;
      keyboardTargetingRef.current = false;
      setSketch(EMPTY_DRAW_SKETCH_STATE);
    };
  }, [cancelFocusRestore, map, setKeyboardTargetingMode]);

  useEffect(() => {
    handleRef.current?.setShape(activeDrawShape);
    setKeyboardTargetingMode(false);
  }, [activeDrawShape, setKeyboardTargetingMode]);

  useEffect(() => {
    handleRef.current?.setActive(getToolActivation(activeMode).draw && sceneReady);
    setKeyboardTargetingMode(false);
  }, [activeMode, sceneReady, setKeyboardTargetingMode]);

  useEffect(() => {
    if (!map || !getToolActivation(activeMode).draw || !sceneReady) {
      return;
    }

    const viewport = map.getViewport();
    const previousCursor = viewport.style.cursor;
    const drawCursor = resolveDrawCursor(activeDrawShape);
    viewport.style.cursor = drawCursor;

    return () => {
      // 다른 interaction이 이후 커서를 바꿨다면 그 값을 덮어쓰지 않습니다.
      if (viewport.style.cursor === drawCursor) {
        viewport.style.cursor = previousCursor;
      }
    };
  }, [activeDrawShape, activeMode, map, sceneReady]);

  const confirmDiscardSketch = useCallback(async () => {
    const currentSketch = sketchRef.current;
    if (!currentSketch.isDrawing) {
      return true;
    }

    const confirmationContext = useEditorStore.getState();
    const sceneAtRequest = confirmationContext.scene;
    const sessionIdAtRequest = confirmationContext.sessionId;

    const confirmed = await confirmDialog({
      title: "그리기를 취소할까요?",
      description: `지금까지 찍은 점 ${currentSketch.vertexCount}개는 저장되지 않습니다.`,
      confirmLabel: "그리기 취소",
      cancelLabel: "계속 그리기",
      tone: "danger",
      initialFocus: "cancel",
    });

    const currentContext = useEditorStore.getState();
    if (
      currentContext.scene !== sceneAtRequest ||
      currentContext.sessionId !== sessionIdAtRequest
    ) {
      return false;
    }

    if (confirmed) {
      cancelFocusRestore();
      handleRef.current?.abort();
      setKeyboardTargetingMode(false);
      return true;
    }

    // AlertDialog의 기존 포커스 복원이 끝난 뒤 지도에 돌려, 다음 Enter가 rail 버튼을
    // 다시 누르지 않고 현재 Path 완료 단축키로 이어지게 합니다.
    cancelFocusRestore();
    focusRestoreFrameRef.current = requestAnimationFrame(() => {
      focusRestoreFrameRef.current = null;
      const target = map?.getTargetElement();
      if (target?.isConnected) {
        target.focus({ preventScroll: true });
      }
    });
    return false;
  }, [cancelFocusRestore, map, setKeyboardTargetingMode]);

  // 키보드 동작은 현재 sketch에만 적용합니다. 완성된 scene history는 건드리지 않습니다.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.repeat ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        event.shiftKey ||
        isTextEntryTarget(event.target)
      ) {
        return;
      }

      const editorState = useEditorStore.getState();
      const currentSketch = sketchRef.current;
      const mapHasKeyboardInput =
        map !== null &&
        event.target === map.getTargetElement() &&
        getToolActivation(editorState.activeMode).draw &&
        editorState.scene !== null &&
        !isConfirmationDialogOpen();

      // 조준점은 지도 포커스만으로 나타나지 않습니다. K로 키보드 좌표 입력 모드를
      // 명시적으로 켜야 방향키 이동과 Space 정점 입력이 하나의 동작으로 인식됩니다.
      if (event.code === "KeyK" && mapHasKeyboardInput) {
        setKeyboardTargetingMode(!keyboardTargetingRef.current);
        event.preventDefault();
        return;
      }

      // 지도에 키보드 포커스가 있을 때 화면 중심을 좌표 입력 지점으로 사용합니다.
      // K로 조준 모드를 켠 동안 방향키 이동은 OpenLayers KeyboardPan이 맡고
      // Space만 정점 추가로 소비합니다.
      if (
        event.key === " " &&
        mapHasKeyboardInput &&
        keyboardTargetingRef.current &&
        map
      ) {
        const center = map.getView().getCenter();
        if (center && handleRef.current?.addVertexAtCoordinate(center)) {
          event.preventDefault();
        }
        return;
      }

      const intent = resolveDrawKeyboardIntent({
        key: event.key,
        shape: editorState.activeDrawShape,
        isDrawing: currentSketch.isDrawing,
        canFinish: currentSketch.canFinish,
        canClosePolygon: currentSketch.canClosePolygon,
        confirmationOpen: isConfirmationDialogOpen(),
      });

      if (intent === "finish") {
        // 버튼에서 Enter를 누르면 native click이 완료를 맡으므로 전역 shortcut은 중복 실행하지 않습니다.
        if (isInteractiveControlTarget(event.target)) {
          return;
        }
        const completed =
          editorState.activeDrawShape === GeometryKind.Polygon
            ? handleRef.current?.closePolygon()
            : handleRef.current?.finish();
        if (completed) {
          event.preventDefault();
        }
        return;
      }

      if (intent !== "cancel") {
        return;
      }

      event.preventDefault();
      void confirmDiscardSketch();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [confirmDiscardSketch, map, setKeyboardTargetingMode]);

  const finish = useCallback(() => handleRef.current?.finish() ?? false, []);
  const closePolygon = useCallback(
    () => handleRef.current?.closePolygon() ?? false,
    [],
  );
  const undoVertex = useCallback(() => handleRef.current?.undoVertex() ?? false, []);
  const redoVertex = useCallback(() => handleRef.current?.redoVertex() ?? false, []);
  const discardRedo = useCallback(() => handleRef.current?.discardRedo() ?? false, []);
  // 전역 이벤트 listener는 React effect가 다시 붙기 전에도 최신 sketch 상태를 읽어야 합니다.
  const isDrawingInProgress = useCallback(() => sketchRef.current.isDrawing, []);

  return {
    ...sketch,
    keyboardTargetingActive,
    finish,
    closePolygon,
    undoVertex,
    redoVertex,
    discardRedo,
    isDrawingInProgress,
    confirmDiscardSketch,
    hint: getToolActivation(activeMode).draw
      ? resolveDrawHint(activeDrawShape, sketch.isDrawing)
      : null,
    showPathFinish:
      getToolActivation(activeMode).draw &&
      activeDrawShape === GeometryKind.Path &&
      sketch.isDrawing,
    showPolygonFinish:
      getToolActivation(activeMode).draw &&
      activeDrawShape === GeometryKind.Polygon &&
      sketch.isDrawing,
  };
}
