import type Geometry from "ol/geom/Geometry";
import type OpenLayersMap from "ol/Map";
import { unByKey } from "ol/Observable";
import {
  canEditLayerVertices,
  EditAffordanceKind,
  type EditorScene,
} from "@/pages/editor/types/editorTypes";
import { forEachEditorContentLayer } from "./editorContentLayers";
import { nearestEdgeDistance, nearestVertexDistance } from "./geometryDistance";

// 현재 커서 위치의 편집 동작(없으면 null). 동작 종류는 EditAffordanceKind enum으로 관리합니다.
export type EditAffordance = EditAffordanceKind | null;

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
    return EditAffordanceKind.Delete;
  }
  if (nearestEdgePx <= hitPx) {
    return EditAffordanceKind.Insert;
  }
  return null;
}

// 선택된(편집 가능) 도형들의 OL geometry를 모읍니다.
function collectSelectedGeometries(
  map: OpenLayersMap,
  scene: EditorScene,
  selectedIds: readonly string[],
): Geometry[] {
  const geometries: Geometry[] = [];
  forEachEditorContentLayer(map, (layer, layerId) => {
    if (!canEditLayerVertices(scene, layerId)) {
      return;
    }
    const source = layer.getSource();
    if (!source) {
      return;
    }
    for (const id of selectedIds) {
      const geometry = source.getFeatureById(id)?.getGeometry();
      if (geometry) {
        geometries.push(geometry);
      }
    }
  });
  return geometries;
}

// 커서가 선택 도형의 "정점 위/외곽선/그 외" 중 무엇에 있는지 판정해 onChange로 알립니다(값이 바뀔 때만).
export function attachEditAffordance(
  map: OpenLayersMap,
  options: EditAffordanceOptions,
) {
  const hitPx = options.hitPx ?? DEFAULT_HIT_PX;
  let frameId = 0;
  let pendingPixel: number[] | null = null;
  let last: EditAffordance = null;
  // 비활성 모드(Select 외)에서는 affordance 판정을 멈추고 힌트를 내린다.
  let active = true;

  const emit = (affordance: EditAffordance) => {
    if (affordance !== last) {
      last = affordance;
      options.onChange(affordance);
    }
  };

  const compute = () => {
    frameId = 0;
    if (!active) {
      emit(null);
      return;
    }
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
    if (!active) {
      return;
    }
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

  const setActive = (next: boolean) => {
    active = next;
    if (!next) {
      // 즉시 힌트를 내리고 예약된 계산을 취소한다.
      pendingPixel = null;
      if (frameId !== 0) {
        cancelAnimationFrame(frameId);
        frameId = 0;
      }
      emit(null);
    }
  };

  const detach = () => {
    unByKey(moveKey);
    viewport.removeEventListener("pointerleave", handlePointerLeave);
    if (frameId !== 0) {
      cancelAnimationFrame(frameId);
    }
  };

  return { setActive, detach };
}
