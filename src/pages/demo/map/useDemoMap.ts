import { useT } from "@/shared/i18n/useT";
import { useEffect, useRef } from "react";
import type { EditorSceneInput } from "@/pages/editor/types/editorTypes";
import { createDemoMap } from "./createDemoMap";

export function useDemoMap(scene: EditorSceneInput) {
  const t = useT();
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

  useEffect(() => {
    const zoomIn = targetRef.current?.querySelector<HTMLButtonElement>(".ol-zoom-in");
    const zoomOut = targetRef.current?.querySelector<HTMLButtonElement>(".ol-zoom-out");
    if (zoomIn) zoomIn.title = t("지도 확대");
    if (zoomOut) zoomOut.title = t("지도 축소");
  }, [t]);
  return targetRef;
}
