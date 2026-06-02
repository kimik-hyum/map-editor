import Feature from "ol/Feature";
import Point from "ol/geom/Point";
import VectorLayer from "ol/layer/Vector";
import { fromLonLat } from "ol/proj";
import VectorSource from "ol/source/Vector";
import { Circle as CircleStyle, Fill, Stroke, Style } from "ol/style";
import { editorDefaultTheme } from "@/pages/editor/theme/editorTheme";
import type {
  EditorCoordinate,
  EditorScene,
  GeoJsonGeometry,
} from "@/pages/editor/types/editorTypes";

// 콘텐츠 레이어 위에 그리도록 충분히 높은 zIndex를 줍니다.
const VERTEX_OVERLAY_Z_INDEX = 9999;

function createVertexHandleStyle() {
  const token = editorDefaultTheme.vertexHandle;

  return new Style({
    image: new CircleStyle({
      radius: token.radius,
      fill: new Fill({ color: token.fillColor }),
      stroke: new Stroke({ color: token.strokeColor, width: token.strokeWidth }),
    }),
  });
}

// 닫힌 링의 마지막(=시작과 동일) 좌표를 제거해 핸들이 겹치지 않게 합니다.
function dropClosingDuplicate(ring: EditorCoordinate[]): EditorCoordinate[] {
  if (ring.length > 1) {
    const first = ring[0];
    const last = ring[ring.length - 1];
    if (first[0] === last[0] && first[1] === last[1]) {
      return ring.slice(0, -1);
    }
  }

  return ring;
}

// geometry의 모든 꼭짓점 좌표를 평탄화해 반환합니다.
function collectVertices(geometry: GeoJsonGeometry): EditorCoordinate[] {
  switch (geometry.type) {
    case "Point":
      return [geometry.coordinates];
    case "MultiPoint":
    case "LineString":
      return geometry.coordinates;
    case "MultiLineString":
      return geometry.coordinates.flat();
    case "Polygon":
      return geometry.coordinates.flatMap(dropClosingDuplicate);
    case "MultiPolygon":
      return geometry.coordinates.flatMap((polygon) =>
        polygon.flatMap(dropClosingDuplicate),
      );
    default:
      return [];
  }
}

// 선택된 도형의 꼭짓점 핸들을 그릴 전용 오버레이 레이어를 만듭니다(맵에 한 번만 추가).
export function createVertexOverlayLayer() {
  return new VectorLayer({
    source: new VectorSource(),
    style: createVertexHandleStyle(),
    zIndex: VERTEX_OVERLAY_Z_INDEX,
  });
}

// 선택된 피처들의 꼭짓점에 핸들을 그립니다. 선택/씬이 바뀔 때마다 호출합니다.
export function syncVertexOverlay(
  layer: VectorLayer<VectorSource>,
  scene: EditorScene | null,
  selectedIds: ReadonlySet<string>,
) {
  const source = layer.getSource();
  if (!source) {
    return;
  }

  source.clear();

  if (!scene || selectedIds.size === 0) {
    return;
  }

  const handles: Feature[] = [];
  for (const editorLayer of scene.layers) {
    for (const feature of editorLayer.features) {
      if (!selectedIds.has(feature.id)) {
        continue;
      }

      for (const vertex of collectVertices(feature.feature.geometry)) {
        handles.push(new Feature({ geometry: new Point(fromLonLat(vertex)) }));
      }
    }
  }

  source.addFeatures(handles);
}
