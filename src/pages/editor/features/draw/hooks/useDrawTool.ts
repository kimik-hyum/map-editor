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
  const activeMode = useEditorStore((state) => state.activeMode);
  const activeDrawShape = useEditorStore((state) => state.activeDrawShape);
  const sceneReady = useEditorStore((state) => state.scene !== null);
  const [sketch, setSketch] = useState<DrawSketchState>(EMPTY_DRAW_SKETCH_STATE);

  useEffect(() => {
    if (!map) {
      return;
    }

    const handle = attachFeatureDraw(map, {
      shape: useEditorStore.getState().activeDrawShape,
      onCommit: (geometry) => useEditorStore.getState().addFeatures([{ geometry }]),
      onStateChange: (nextSketch) => {
        sketchRef.current = nextSketch;
        setSketch(nextSketch);
      },
    });
    handleRef.current = handle;

    const state = useEditorStore.getState();
    handle.setActive(getToolActivation(state.activeMode).draw && state.scene !== null);

    return () => {
      handle.detach();
      handleRef.current = null;
      sketchRef.current = EMPTY_DRAW_SKETCH_STATE;
      setSketch(EMPTY_DRAW_SKETCH_STATE);
    };
  }, [map]);

  useEffect(() => {
    handleRef.current?.setShape(activeDrawShape);
  }, [activeDrawShape]);

  useEffect(() => {
    handleRef.current?.setActive(getToolActivation(activeMode).draw && sceneReady);
  }, [activeMode, sceneReady]);

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

    const confirmed = await confirmDialog({
      title: "그리기를 취소할까요?",
      description: `지금까지 찍은 점 ${currentSketch.vertexCount}개는 저장되지 않습니다.`,
      confirmLabel: "그리기 취소",
      cancelLabel: "계속 그리기",
      tone: "danger",
      initialFocus: "cancel",
    });

    if (confirmed) {
      handleRef.current?.abort();
      return true;
    }

    // AlertDialog의 기존 포커스 복원이 끝난 뒤 지도에 돌려, 다음 Enter가 rail 버튼을
    // 다시 누르지 않고 현재 Path 완료 단축키로 이어지게 합니다.
    requestAnimationFrame(() => {
      map?.getTargetElement().focus({ preventScroll: true });
    });
    return false;
  }, [map]);

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
      const intent = resolveDrawKeyboardIntent({
        key: event.key,
        shape: editorState.activeDrawShape,
        isDrawing: currentSketch.isDrawing,
        canFinish: currentSketch.canFinish,
        confirmationOpen: isConfirmationDialogOpen(),
      });

      if (intent === "finish") {
        // 버튼에서 Enter를 누르면 native click이 완료를 맡으므로 전역 shortcut은 중복 실행하지 않습니다.
        if (isInteractiveControlTarget(event.target)) {
          return;
        }
        if (handleRef.current?.finish()) {
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
  }, [confirmDiscardSketch]);

  const finish = useCallback(() => handleRef.current?.finish() ?? false, []);
  const undoVertex = useCallback(() => handleRef.current?.undoVertex() ?? false, []);
  const redoVertex = useCallback(() => handleRef.current?.redoVertex() ?? false, []);
  const discardRedo = useCallback(() => handleRef.current?.discardRedo() ?? false, []);

  return {
    ...sketch,
    finish,
    undoVertex,
    redoVertex,
    discardRedo,
    confirmDiscardSketch,
    hint: getToolActivation(activeMode).draw
      ? resolveDrawHint(activeDrawShape, sketch.isDrawing)
      : null,
    showPathFinish:
      getToolActivation(activeMode).draw &&
      activeDrawShape === GeometryKind.Path &&
      sketch.isDrawing,
  };
}
