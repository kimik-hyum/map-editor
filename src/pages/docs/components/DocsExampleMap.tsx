import { useMemo } from "react";
import { useDemoMap } from "@/pages/demo/map/useDemoMap";
import type { EditorSceneInput } from "../content/examples/editor-contract.example";
import "ol/ol.css";

export function DocsExampleMap({ scene }: { scene: EditorSceneInput }) {
  // 외부 계약의 임의 themeToken 대신 문서 미리보기의 기본 스타일을 사용합니다.
  const previewScene = useMemo(
    () => ({
      ...scene,
      features: scene.features.map((feature) => ({
        ...feature,
        themeToken: undefined,
      })),
    }),
    [scene],
  );
  const mapRef = useDemoMap(previewScene);
  return (
    <div
      ref={mapRef}
      role="img"
      aria-label="경복궁 예제 권역·경로·마커의 현재 지도"
      className="h-[300px] w-full bg-slate-100"
    />
  );
}
