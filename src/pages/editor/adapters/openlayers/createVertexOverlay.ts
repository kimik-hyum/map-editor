import Feature from "ol/Feature";
import type { Extent } from "ol/extent";
import Point from "ol/geom/Point";
import VectorLayer from "ol/layer/Vector";
import { fromLonLat, toLonLat } from "ol/proj";
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

// 줌 LOD: 이 줌 미만으로 줌아웃하면 정점 핸들을 그리지 않습니다(전체가 작게 보이는 구간은 표시 의미가 적음).
export const VERTEX_HANDLE_MIN_ZOOM = 12;

// 뷰포트 컬링 시 화면 가장자리 깜빡임을 줄이기 위한 여유 버퍼(px).
const VERTEX_CULL_BUFFER_PX = 32;

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

// 정점 가시성 판단에 필요한 화면 상태(경위도 컬링 박스 + 줌). ol에 의존하지 않아 순수 테스트가 쉽습니다.
export type VertexCullBox = {
  // 이 줌 미만이면 전부 숨김(줌 LOD).
  minZoom: number;
  // 현재 뷰 줌.
  zoom: number;
  // 컬링용 경위도 범위(버퍼 포함). [minLon, minLat, maxLon, maxLat].
  lonLatExtent: [number, number, number, number];
};

// 선택된 도형의 꼭짓점 중 "지금 화면에 그릴" 좌표만 골라 반환합니다.
// 1) 줌 LOD: zoom < minZoom 이면 빈 배열. 2) 뷰포트 컬링: 경위도 박스 안 좌표만.
// 순수 함수입니다(부수효과·투영 없음). 무거운 fromLonLat는 살아남은 좌표에만 호출하도록 호출부에서 분리합니다.
export function collectVisibleVertexCoords(
  scene: EditorScene | null,
  selectedIds: ReadonlySet<string>,
  box: VertexCullBox,
): EditorCoordinate[] {
  if (!scene || selectedIds.size === 0) {
    return [];
  }
  if (box.zoom < box.minZoom) {
    return [];
  }

  const [minLon, minLat, maxLon, maxLat] = box.lonLatExtent;
  const visible: EditorCoordinate[] = [];

  for (const editorLayer of scene.layers) {
    for (const feature of editorLayer.features) {
      if (!selectedIds.has(feature.id)) {
        continue;
      }

      for (const vertex of collectVertices(feature.feature.geometry)) {
        const [lon, lat] = vertex;
        if (lon >= minLon && lon <= maxLon && lat >= minLat && lat <= maxLat) {
          visible.push(vertex);
        }
      }
    }
  }

  return visible;
}

// 정점 오버레이를 다시 계산할 때 필요한 현재 뷰 상태. EditorPage가 ol View에서 읽어 전달합니다.
export type VertexOverlayViewInfo = {
  zoom: number;
  // 뷰 투영(EPSG:3857) 기준 해상도(map units/px). 컬링 버퍼 계산에 사용.
  resolution: number;
  // 뷰 투영(EPSG:3857) 기준 화면 범위.
  extent: Extent;
};

// 선택된 도형의 꼭짓점 핸들을 그립니다. 선택/씬/뷰가 바뀔 때마다 호출합니다.
// viewInfo가 있으면 줌 LOD + 뷰포트 컬링을 적용하고, 없으면(초기 등) 안전하게 전체를 그립니다.
export function syncVertexOverlay(
  layer: VectorLayer<VectorSource>,
  scene: EditorScene | null,
  selectedIds: ReadonlySet<string>,
  viewInfo?: VertexOverlayViewInfo,
): void {
  const source = layer.getSource();
  if (!source) {
    return;
  }

  source.clear();

  if (!scene || selectedIds.size === 0) {
    return;
  }

  let box: VertexCullBox;
  if (viewInfo) {
    const buffer = VERTEX_CULL_BUFFER_PX * viewInfo.resolution;
    const [minX, minY, maxX, maxY] = viewInfo.extent;
    const [minLon, minLat] = toLonLat([minX - buffer, minY - buffer]);
    const [maxLon, maxLat] = toLonLat([maxX + buffer, maxY + buffer]);
    box = {
      minZoom: VERTEX_HANDLE_MIN_ZOOM,
      zoom: viewInfo.zoom,
      lonLatExtent: [minLon, minLat, maxLon, maxLat],
    };
  } else {
    // 뷰 정보를 모르면 최적화 없이 전체 표시(빈 화면 방지).
    box = {
      minZoom: Number.NEGATIVE_INFINITY,
      zoom: 0,
      lonLatExtent: [-180, -90, 180, 90],
    };
  }

  const coords = collectVisibleVertexCoords(scene, selectedIds, box);
  if (coords.length === 0) {
    return;
  }

  source.addFeatures(
    coords.map((vertex) => new Feature({ geometry: new Point(fromLonLat(vertex)) })),
  );
}

// 선택된 도형의 꼭짓점 핸들을 그릴 전용 오버레이 레이어를 만듭니다(맵에 한 번만 추가).
export function createVertexOverlayLayer() {
  return new VectorLayer({
    source: new VectorSource(),
    style: createVertexHandleStyle(),
    zIndex: VERTEX_OVERLAY_Z_INDEX,
  });
}
