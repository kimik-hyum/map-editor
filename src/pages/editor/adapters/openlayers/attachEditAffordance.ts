import type Geometry from "ol/geom/Geometry";
import SimpleGeometry from "ol/geom/SimpleGeometry";
import VectorLayer from "ol/layer/Vector";
import type OpenLayersMap from "ol/Map";
import { unByKey } from "ol/Observable";
import type { EditorScene } from "@/pages/editor/types/editorTypes";
import { isLayerVertexEditable } from "./attachVertexModify";
import { editorLayerIdProperty } from "./createOpenLayersLayer";

// 커서 위치에서 가능한 정점 편집 동작. insert=외곽선(정점 없음), delete=정점 위, null=해당 없음.
export type EditAffordance = "insert" | "delete" | null;

// 커서가 정점/외곽선에 닿았다고 볼 픽셀 허용오차(ol Modify의 pixelTolerance와 맞춤).
const DEFAULT_HIT_PX = 10;

type EditAffordanceOptions = {
  getScene: () => EditorScene | null;
  getSelectedIds: () => readonly string[];
  onChange: (affordance: EditAffordance) => void;
  hitPx?: number;
};

// 순수 결정 로직: 정점이 먼저(삭제), 그다음 외곽선(추가). 둘 다 멀면 null.
export function decideAffordance(
  nearestVertexPx: number,
  nearestEdgePx: number,
  hitPx: number,
): EditAffordance {
  if (nearestVertexPx <= hitPx) {
    return "delete";
  }
  if (nearestEdgePx <= hitPx) {
    return "insert";
  }
  return null;
}

function distance(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, ay - by);
}

// 선택된(편집 가능) 도형들의 OL geometry를 모읍니다.
function collectSelectedGeometries(
  map: OpenLayersMap,
  scene: EditorScene,
  selectedIds: readonly string[],
): Geometry[] {
  const geometries: Geometry[] = [];
  for (const layer of map.getLayers().getArray()) {
    if (!(layer instanceof VectorLayer)) {
      continue;
    }
    const layerId = layer.get(editorLayerIdProperty);
    if (typeof layerId !== "string" || !isLayerVertexEditable(scene, layerId)) {
      continue;
    }
    const source = layer.getSource();
    if (!source) {
      continue;
    }
    for (const id of selectedIds) {
      const geometry = source.getFeatureById(id)?.getGeometry();
      if (geometry) {
        geometries.push(geometry);
      }
    }
  }
  return geometries;
}

// 커서 좌표에서 가장 가까운 정점까지의 거리(map unit).
function nearestVertexDistance(geometries: Geometry[], cursor: number[]): number {
  let min = Number.POSITIVE_INFINITY;
  for (const geometry of geometries) {
    if (!(geometry instanceof SimpleGeometry)) {
      continue;
    }
    const flat = geometry.getFlatCoordinates();
    const stride = geometry.getStride();
    for (let i = 0; i + 1 < flat.length; i += stride) {
      const d = distance(flat[i], flat[i + 1], cursor[0], cursor[1]);
      if (d < min) {
        min = d;
      }
    }
  }
  return min;
}

// 커서 좌표에서 가장 가까운 외곽선(경계)까지의 거리(map unit). Polygon.getClosestPoint는 경계 기준.
function nearestEdgeDistance(geometries: Geometry[], cursor: number[]): number {
  let min = Number.POSITIVE_INFINITY;
  for (const geometry of geometries) {
    const closest = geometry.getClosestPoint(cursor);
    const d = distance(closest[0], closest[1], cursor[0], cursor[1]);
    if (d < min) {
      min = d;
    }
  }
  return min;
}

// 커서가 선택 도형의 "정점 위/외곽선/그 외" 중 무엇에 있는지 판정해 onChange로 알립니다(값이 바뀔 때만).
export function attachEditAffordance(
  map: OpenLayersMap,
  options: EditAffordanceOptions,
): () => void {
  const hitPx = options.hitPx ?? DEFAULT_HIT_PX;
  let frameId = 0;
  let pendingPixel: number[] | null = null;
  let last: EditAffordance = null;

  const emit = (affordance: EditAffordance) => {
    if (affordance !== last) {
      last = affordance;
      options.onChange(affordance);
    }
  };

  const compute = () => {
    frameId = 0;
    const pixel = pendingPixel;
    const scene = options.getScene();
    const selectedIds = options.getSelectedIds();
    const resolution = map.getView().getResolution();
    if (!pixel || !scene || selectedIds.length === 0 || resolution === undefined) {
      emit(null);
      return;
    }
    const cursor = map.getCoordinateFromPixel(pixel);
    if (!cursor) {
      emit(null);
      return;
    }
    const geometries = collectSelectedGeometries(map, scene, selectedIds);
    if (geometries.length === 0) {
      emit(null);
      return;
    }
    const vertexPx = nearestVertexDistance(geometries, cursor) / resolution;
    const edgePx = nearestEdgeDistance(geometries, cursor) / resolution;
    emit(decideAffordance(vertexPx, edgePx, hitPx));
  };

  const schedule = () => {
    if (frameId === 0) {
      frameId = requestAnimationFrame(compute);
    }
  };

  const moveKey = map.on("pointermove", (event) => {
    if (event.dragging) {
      // 드래그(편집/팬) 중에는 힌트를 내린다.
      pendingPixel = null;
      schedule();
      return;
    }
    pendingPixel = event.pixel;
    schedule();
  });

  const viewport = map.getViewport();
  const handlePointerLeave = () => {
    pendingPixel = null;
    emit(null);
  };
  viewport.addEventListener("pointerleave", handlePointerLeave);

  return () => {
    unByKey(moveKey);
    viewport.removeEventListener("pointerleave", handlePointerLeave);
    if (frameId !== 0) {
      cancelAnimationFrame(frameId);
    }
  };
}
