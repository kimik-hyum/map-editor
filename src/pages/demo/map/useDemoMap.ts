import { useEffect, useRef } from "react";
import type { EditorSceneInput } from "@/pages/editor/types/editorTypes";
import { createDemoMap } from "./createDemoMap";

export function useDemoMap(scene: EditorSceneInput) {
  const targetRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<ReturnType<typeof createDemoMap> | null>(null);

  useEffect(() => {
    if (!targetRef.current) return;
    const map = createDemoMap(targetRef.current);
    mapRef.current = map;
    return () => {
      mapRef.current = null;
      map.dispose();
    };
  }, []);

  useEffect(() => {
    mapRef.current?.sync(scene);
  }, [scene]);

  return targetRef;
}
