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
import { resolveDrawHint } from "../model/drawToolModel";

export function useDrawTool(map: OpenLayersMap | null) {
  const handleRef = useRef<ReturnType<typeof attachFeatureDraw> | null>(null);
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
      onStateChange: setSketch,
    });
    handleRef.current = handle;

    const state = useEditorStore.getState();
    handle.setActive(getToolActivation(state.activeMode).draw && state.scene !== null);

    return () => {
      handle.detach();
      handleRef.current = null;
      setSketch(EMPTY_DRAW_SKETCH_STATE);
    };
  }, [map]);

  useEffect(() => {
    handleRef.current?.setShape(activeDrawShape);
  }, [activeDrawShape]);

  useEffect(() => {
    handleRef.current?.setActive(getToolActivation(activeMode).draw && sceneReady);
  }, [activeMode, sceneReady]);

  // ESC는 현재 sketch만 취소합니다. 완성된 scene history에는 영향을 주지 않습니다.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key === "Escape" &&
        !isTextEntryTarget(event.target) &&
        handleRef.current?.abort()
      ) {
        event.preventDefault();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const finish = useCallback(() => handleRef.current?.finish() ?? false, []);
  const undoVertex = useCallback(() => handleRef.current?.undoVertex() ?? false, []);
  const redoVertex = useCallback(() => handleRef.current?.redoVertex() ?? false, []);

  return {
    ...sketch,
    finish,
    undoVertex,
    redoVertex,
    hint: getToolActivation(activeMode).draw
      ? resolveDrawHint(activeDrawShape, sketch.isDrawing)
      : null,
    showPathFinish:
      getToolActivation(activeMode).draw &&
      activeDrawShape === GeometryKind.Path &&
      sketch.isDrawing,
  };
}
