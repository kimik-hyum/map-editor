import Feature from "ol/Feature";
import VectorLayer from "ol/layer/Vector";
import type OpenLayersMap from "ol/Map";
import VectorSource from "ol/source/Vector";
import { Fill, Stroke, Style } from "ol/style";
import { editorDefaultTheme } from "@/pages/editor/theme/editorTheme";
import type { PolygonalGeometry } from "@/pages/editor/types/editorTypes";
import { createOpenLayersGeometry } from "./createOpenLayersGeometry";

// id 없는 전용 preview는 선택/저장/scene history의 대상이 아닙니다.
export function attachHoleFillPreview(map: OpenLayersMap) {
  const feature = new Feature();
  const token = editorDefaultTheme.holeFillPreview;
  feature.setStyle(
    new Style({
      fill: new Fill({ color: token.fillColor }),
      stroke: new Stroke({ color: token.strokeColor, width: 2, lineDash: [5, 4] }),
    }),
  );
  const layer = new VectorLayer({
    source: new VectorSource({ features: [feature] }),
    zIndex: 95_000,
  });
  map.addLayer(layer);
  return {
    sync(geometry: PolygonalGeometry | null) {
      feature.setGeometry(geometry ? createOpenLayersGeometry(geometry) : undefined);
    },
    detach() {
      map.removeLayer(layer);
    },
  };
}
