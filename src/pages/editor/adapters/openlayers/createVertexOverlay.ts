import Feature from "ol/Feature";
import type { Extent } from "ol/extent";
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

// 대표 정점 사이 최소 간격(px). 줌아웃일수록 월드 격자 셀이 커져 대표점이 듬성해집니다.
const VERTEX_MIN_SPACING_PX = 18;

// 뷰포트 컬링 시 화면 가장자리 깜빡임을 줄이기 위한 여유 버퍼(px).
const VERTEX_CULL_BUFFER_PX = 32;

// 한 번에 그릴 핸들 수 안전 상한. 초과하면 셀을 키워 더 솎습니다(주 제어 수단이 아닌 안전장치).
const VERTEX_MAX_HANDLES = 2000;

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

// 투영(EPSG:3857) 좌표로 옮긴 정점. 데시메이션·컬링은 모두 이 투영 공간에서 처리합니다.
export type ProjectedVertex = {
  // 링/라인 내 원본 좌표 인덱스(동률 시 안정 정렬용). 편집 단계(#11)에서 ref로 확장 예정.
  index: number;
  x: number;
  y: number;
  // 링 anchor·라인 끝점은 항상 유지(silhouette 보존).
  mandatory: boolean;
  // 방향 변화 크기(0~π). 같은 셀에서 더 큰 쪽을 대표로 남겨 코너 손실을 줄입니다.
  turnScore: number;
};

type ProjectFn = (lon: number, lat: number) => [number, number];

// 링(또는 라인)의 각 정점에서 방향 변화 크기를 계산합니다(이웃 세그먼트가 꺾인 정도).
function ringTurnScores(
  points: ReadonlyArray<{ x: number; y: number }>,
  closed: boolean,
): number[] {
  const n = points.length;
  const scores = new Array<number>(n).fill(0);
  for (let i = 0; i < n; i += 1) {
    const prev = closed ? points[(i - 1 + n) % n] : points[i - 1];
    const next = closed ? points[(i + 1) % n] : points[i + 1];
    if (!prev || !next) {
      continue;
    }
    const ax = points[i].x - prev.x;
    const ay = points[i].y - prev.y;
    const bx = next.x - points[i].x;
    const by = next.y - points[i].y;
    const cross = ax * by - ay * bx;
    const dot = ax * bx + ay * by;
    scores[i] = Math.abs(Math.atan2(cross, dot));
  }
  return scores;
}

// 한 geometry의 정점을 투영 공간 정점 목록으로 평탄화합니다(mandatory/turnScore 포함).
export function buildProjectedVertices(
  geometry: GeoJsonGeometry,
  project: ProjectFn,
): ProjectedVertex[] {
  const out: ProjectedVertex[] = [];

  const addPoint = (coordinate: EditorCoordinate, index: number) => {
    const [x, y] = project(coordinate[0], coordinate[1]);
    out.push({ index, x, y, mandatory: true, turnScore: 0 });
  };

  const addRing = (ring: EditorCoordinate[], closed: boolean) => {
    const coords = closed ? dropClosingDuplicate(ring) : ring;
    const points = coords.map((coordinate) => {
      const [x, y] = project(coordinate[0], coordinate[1]);
      return { x, y };
    });
    const scores = ringTurnScores(points, closed);
    coords.forEach((_coordinate, i) => {
      const mandatory = closed ? i === 0 : i === 0 || i === coords.length - 1;
      out.push({
        index: i,
        x: points[i].x,
        y: points[i].y,
        mandatory,
        turnScore: scores[i],
      });
    });
  };

  switch (geometry.type) {
    case "Point":
      addPoint(geometry.coordinates, 0);
      break;
    case "MultiPoint":
      geometry.coordinates.forEach(addPoint);
      break;
    case "LineString":
      addRing(geometry.coordinates, false);
      break;
    case "MultiLineString":
      geometry.coordinates.forEach((line) => {
        addRing(line, false);
      });
      break;
    case "Polygon":
      geometry.coordinates.forEach((ring) => {
        addRing(ring, true);
      });
      break;
    case "MultiPolygon":
      geometry.coordinates.forEach((polygon) => {
        polygon.forEach((ring) => {
          addRing(ring, true);
        });
      });
      break;
    default:
      break;
  }

  return out;
}

function bucketKey(value: ProjectedVertex, cellSize: number): string {
  return `${Math.floor(value.x / cellSize)}:${Math.floor(value.y / cellSize)}`;
}

// 월드 고정 격자로 한 차례 솎습니다: 필수점은 항상 유지, 그 외엔 셀당 turnScore 최대 1개.
function decimateOnce(
  vertices: readonly ProjectedVertex[],
  cellSize: number,
): ProjectedVertex[] {
  const mandatoryBuckets = new Set<string>();
  const kept: ProjectedVertex[] = [];
  for (const vertex of vertices) {
    if (vertex.mandatory) {
      kept.push(vertex);
      mandatoryBuckets.add(bucketKey(vertex, cellSize));
    }
  }

  const bestPerBucket = new Map<string, ProjectedVertex>();
  for (const vertex of vertices) {
    if (vertex.mandatory) {
      continue;
    }
    const key = bucketKey(vertex, cellSize);
    if (mandatoryBuckets.has(key)) {
      continue; // 필수점이 있는 셀은 중복 표시를 피해 건너뜀
    }
    const current = bestPerBucket.get(key);
    if (
      !current ||
      vertex.turnScore > current.turnScore ||
      (vertex.turnScore === current.turnScore && vertex.index < current.index)
    ) {
      bestPerBucket.set(key, vertex);
    }
  }

  for (const vertex of bestPerBucket.values()) {
    kept.push(vertex);
  }
  return kept;
}

// 대표 정점을 고릅니다. 상한(maxCount)을 넘으면 셀을 2배씩 키워 다시 솎습니다(필수점 미만으로는 못 줄임).
export function decimateProjectedVertices(
  vertices: readonly ProjectedVertex[],
  options: { cellSize: number; maxCount: number },
): ProjectedVertex[] {
  if (options.cellSize <= 0) {
    return [...vertices];
  }

  let cellSize = options.cellSize;
  let result = decimateOnce(vertices, cellSize);
  for (
    let attempt = 0;
    attempt < 24 && result.length > options.maxCount;
    attempt += 1
  ) {
    cellSize *= 2;
    result = decimateOnce(vertices, cellSize);
  }
  return result;
}

// 정점 오버레이를 다시 계산할 때 필요한 현재 뷰 상태. EditorPage가 ol View에서 읽어 전달합니다.
export type VertexOverlayViewInfo = {
  zoom: number;
  // 뷰 투영(EPSG:3857) 기준 해상도(map units/px). 셀 크기·컬링 버퍼 계산에 사용.
  resolution: number;
  // 뷰 투영(EPSG:3857) 기준 화면 범위.
  extent: Extent;
};

// fractional 줌마다 대표점이 미세하게 튀지 않도록 줌을 버킷에 스냅한 해상도를 씁니다.
function bucketResolution(viewInfo: VertexOverlayViewInfo): number {
  const zoomBucket = Math.floor(viewInfo.zoom * 2) / 2;
  return viewInfo.resolution * 2 ** (viewInfo.zoom - zoomBucket);
}

function collectSelectedProjectedVertices(
  scene: EditorScene,
  selectedIds: ReadonlySet<string>,
  project: ProjectFn,
): ProjectedVertex[] {
  const all: ProjectedVertex[] = [];
  for (const editorLayer of scene.layers) {
    for (const feature of editorLayer.features) {
      if (!selectedIds.has(feature.id)) {
        continue;
      }
      all.push(...buildProjectedVertices(feature.feature.geometry, project));
    }
  }
  return all;
}

// 선택된 도형의 꼭짓점 핸들을 그립니다. 선택/씬/뷰가 바뀔 때마다 호출합니다.
// viewInfo가 있으면 월드 고정 데시메이션(대표점) + 뷰포트 컬링을 적용하고, 없으면(초기 등) 전체를 그립니다.
// (성능 메모: 현재는 호출마다 투영·데시메이션을 다시 계산합니다. 대량 정점에서 느려지면
//  feature+zoomBucket 캐시를 도입하면 됩니다 — 월드 고정이라 결과가 동일해 안전합니다.)
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

  const project: ProjectFn = (lon, lat) => fromLonLat([lon, lat]) as [number, number];
  const all = collectSelectedProjectedVertices(scene, selectedIds, project);

  let visible: ProjectedVertex[];
  if (viewInfo) {
    // 1) 월드 고정 데시메이션(팬 무관·줌버킷 안정) → 2) 뷰포트 컬링.
    const cellSize = VERTEX_MIN_SPACING_PX * bucketResolution(viewInfo);
    const representatives = decimateProjectedVertices(all, {
      cellSize,
      maxCount: VERTEX_MAX_HANDLES,
    });
    const buffer = VERTEX_CULL_BUFFER_PX * viewInfo.resolution;
    const [minX, minY, maxX, maxY] = viewInfo.extent;
    visible = representatives.filter(
      (vertex) =>
        vertex.x >= minX - buffer &&
        vertex.x <= maxX + buffer &&
        vertex.y >= minY - buffer &&
        vertex.y <= maxY + buffer,
    );
  } else {
    visible = all;
  }

  if (visible.length === 0) {
    return;
  }

  source.addFeatures(
    visible.map((vertex) => new Feature({ geometry: new Point([vertex.x, vertex.y]) })),
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
