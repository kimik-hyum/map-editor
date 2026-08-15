import type Feature from "ol/Feature";
import type { EventsKey } from "ol/events";
import { never } from "ol/events/condition";
import type Geometry from "ol/geom/Geometry";
import LineString from "ol/geom/LineString";
import Point from "ol/geom/Point";
import Polygon from "ol/geom/Polygon";
import Draw, { type DrawEvent } from "ol/interaction/Draw";
import type OpenLayersMap from "ol/Map";
import { unByKey } from "ol/Observable";
import {
  GeometryKind,
  type DrawShape,
  type GeoJsonGeometry,
} from "@/pages/editor/types/editorTypes";
import { olGeometryToEditorGeometry } from "./olGeometryToEditorGeometry";

const POLYGON_CLOSE_TOLERANCE_PX = 12;

export type DrawSketchState = {
  isDrawing: boolean;
  vertexCount: number;
  canFinish: boolean;
  canUndo: boolean;
  canRedo: boolean;
};

export const EMPTY_DRAW_SKETCH_STATE: DrawSketchState = {
  isDrawing: false,
  vertexCount: 0,
  canFinish: false,
  canUndo: false,
  canRedo: false,
};

type FeatureDrawOptions = {
  shape: DrawShape;
  onCommit: (geometry: GeoJsonGeometry) => void;
  onStateChange: (state: DrawSketchState) => void;
};

type DrawGeometryType = "Point" | "LineString" | "Polygon";

export function drawGeometryTypeForShape(shape: DrawShape): DrawGeometryType {
  if (shape === GeometryKind.Point) {
    return "Point";
  }
  if (shape === GeometryKind.Path) {
    return "LineString";
  }
  return "Polygon";
}

// Draw sketch geometry는 마지막에 커서를 따라다니는 임시 좌표를 하나 더 갖습니다.
export function confirmedDrawVertexCount(geometry: Geometry): number {
  if (geometry instanceof Point) {
    return 1;
  }
  if (geometry instanceof LineString) {
    return Math.max(0, geometry.getCoordinates().length - 1);
  }
  if (geometry instanceof Polygon) {
    return Math.max(0, (geometry.getCoordinates()[0]?.length ?? 0) - 1);
  }
  return 0;
}

export function canFinishDraw(shape: DrawShape, vertexCount: number): boolean {
  return shape === GeometryKind.Path && vertexCount >= 2;
}

export function isWithinPixelTolerance(
  pixel: readonly number[],
  targetPixel: readonly number[],
  tolerance: number,
): boolean {
  const dx = pixel[0] - targetPixel[0];
  const dy = pixel[1] - targetPixel[1];
  return Math.sqrt(dx * dx + dy * dy) <= tolerance;
}

export function shouldFinishFromPointer(
  shape: DrawShape,
  vertexCount: number,
  isNearStart: boolean,
): boolean {
  if (shape === GeometryKind.Point) {
    return true;
  }
  if (shape === GeometryKind.Path) {
    return false;
  }
  return vertexCount >= 3 && isNearStart;
}

function readFirstCoordinate(geometry: Geometry): number[] | null {
  if (geometry instanceof Polygon) {
    return geometry.getCoordinates()[0]?.[0]?.slice() ?? null;
  }
  if (geometry instanceof LineString) {
    return geometry.getCoordinates()[0]?.slice() ?? null;
  }
  if (geometry instanceof Point) {
    return geometry.getCoordinates().slice();
  }
  return null;
}

function readLastConfirmedCoordinate(geometry: Geometry): number[] | null {
  if (geometry instanceof LineString) {
    const coordinates = geometry.getCoordinates();
    return coordinates[coordinates.length - 2]?.slice() ?? null;
  }
  if (geometry instanceof Polygon) {
    const coordinates = geometry.getCoordinates()[0] ?? [];
    return coordinates[coordinates.length - 2]?.slice() ?? null;
  }
  return null;
}

// Polygon/Path/Point 생성을 전담하는 OpenLayers adapter입니다.
// sketch는 Draw 내부 overlay에만 두고, 완성된 EPSG:4326 GeoJSON만 callback으로 올립니다.
export function attachFeatureDraw(map: OpenLayersMap, options: FeatureDrawOptions) {
  let shape = options.shape;
  let active = false;
  let drawing = false;
  let vertexCount = 0;
  let firstCoordinate: number[] | null = null;
  let sketchFeature: Feature<Geometry> | null = null;
  let geometryChangeKey: EventsKey | null = null;
  let internalVertexMutation = false;
  const redoCoordinates: number[][] = [];

  const emitState = () => {
    options.onStateChange({
      isDrawing: drawing,
      vertexCount,
      canFinish: drawing && canFinishDraw(shape, vertexCount),
      canUndo: drawing && shape !== GeometryKind.Point && vertexCount > 0,
      // 첫 정점 undo는 OpenLayers sketch를 종료하므로, drawing이 false여도
      // 바로 이어지는 redo로 복원할 수 있게 좌표를 보존합니다. 모드 전환이나 전역 undo에서는 폐기합니다.
      canRedo: shape !== GeometryKind.Point && redoCoordinates.length > 0,
    });
  };

  const unbindGeometry = () => {
    if (geometryChangeKey) {
      unByKey(geometryChangeKey);
      geometryChangeKey = null;
    }
  };

  const resetSketch = (clearRedo = true) => {
    unbindGeometry();
    drawing = false;
    vertexCount = 0;
    firstCoordinate = null;
    sketchFeature = null;
    if (clearRedo) {
      redoCoordinates.length = 0;
    }
    emitState();
  };

  const discardRedo = () => {
    if (redoCoordinates.length === 0) {
      return false;
    }
    redoCoordinates.length = 0;
    emitState();
    return true;
  };

  const handleGeometryChange = () => {
    const geometry = sketchFeature?.getGeometry();
    if (!geometry) {
      return;
    }
    const nextCount = confirmedDrawVertexCount(geometry);
    if (nextCount > vertexCount && !internalVertexMutation) {
      // undo 뒤 새 점을 찍으면 일반 history와 마찬가지로 redo 분기를 버립니다.
      redoCoordinates.length = 0;
    }
    if (nextCount !== vertexCount) {
      vertexCount = nextCount;
      emitState();
    }
  };

  const handleDrawStart = (event: DrawEvent) => {
    unbindGeometry();
    drawing = true;
    if (!internalVertexMutation) {
      redoCoordinates.length = 0;
    }
    sketchFeature = event.feature as Feature<Geometry>;
    const geometry = sketchFeature.getGeometry();
    firstCoordinate = geometry ? readFirstCoordinate(geometry) : null;
    vertexCount = geometry ? confirmedDrawVertexCount(geometry) : 0;
    if (geometry) {
      geometryChangeKey = geometry.on("change", handleGeometryChange);
    }
    emitState();
  };

  const handleDrawEnd = (event: DrawEvent) => {
    const geometry = event.feature.getGeometry();
    resetSketch();
    if (geometry) {
      options.onCommit(olGeometryToEditorGeometry(geometry));
    }
  };

  // 마지막 남은 정점을 removeLastPoint 하면 OL이 sketch를 abort합니다.
  // 사용자 취소와 달리 로컬 undo가 만든 abort에서는 redo 좌표를 보존합니다.
  const handleDrawAbort = () => resetSketch(!internalVertexMutation);

  let startKey: EventsKey;
  let endKey: EventsKey;
  let abortKey: EventsKey;

  const buildDraw = () => {
    const instance = new Draw({
      type: drawGeometryTypeForShape(shape),
      stopClick: true,
      snapTolerance: POLYGON_CLOSE_TOLERANCE_PX,
      // 기본 Shift 자유그리기는 정점 단위 undo/redo 계약과 충돌하므로 명시적으로 끕니다.
      freehandCondition: never,
      // Path는 버튼으로만 끝내고, Polygon은 시작점 근처를 클릭할 때만 끝냅니다.
      finishCondition: (event) => {
        if (shape === GeometryKind.Point) {
          return true;
        }
        if (!firstCoordinate) {
          return false;
        }
        const firstPixel = map.getPixelFromCoordinate(firstCoordinate);
        return shouldFinishFromPointer(
          shape,
          vertexCount,
          isWithinPixelTolerance(event.pixel, firstPixel, POLYGON_CLOSE_TOLERANCE_PX),
        );
      },
    });
    startKey = instance.on("drawstart", handleDrawStart);
    endKey = instance.on("drawend", handleDrawEnd);
    abortKey = instance.on("drawabort", handleDrawAbort);
    return instance;
  };

  const unbindDraw = () => {
    unByKey(startKey);
    unByKey(endKey);
    unByKey(abortKey);
  };

  let draw = buildDraw();
  draw.setActive(false);
  // interaction은 뒤에 추가될수록 이벤트 우선순위가 높습니다. Draw 모드에서는 기존 선택/편집도 꺼집니다.
  map.addInteraction(draw);

  const abort = () => {
    if (!drawing) {
      return false;
    }
    draw.abortDrawing();
    return true;
  };

  const recreateDraw = (nextShape: DrawShape) => {
    abort();
    // 첫 정점 undo로 sketch가 이미 끝난 경우 abort()는 no-op입니다.
    // 이전 도형의 좌표가 새 Draw 타입으로 복구되지 않도록 redo 분기를 별도로 폐기합니다.
    discardRedo();
    unbindDraw();
    map.removeInteraction(draw);
    shape = nextShape;
    draw = buildDraw();
    draw.setActive(active);
    map.addInteraction(draw);
  };

  const setActive = (next: boolean) => {
    if (active === next) {
      return;
    }
    if (!next) {
      abort();
      // drawing=false인 첫 정점 undo 상태에서도 비활성 Draw에 redo가 남지 않게 합니다.
      discardRedo();
    }
    active = next;
    draw.setActive(next);
  };

  const setShape = (nextShape: DrawShape) => {
    if (shape !== nextShape) {
      recreateDraw(nextShape);
    }
  };

  const finish = () => {
    if (!drawing || !canFinishDraw(shape, vertexCount)) {
      return false;
    }
    return draw.finishDrawing() !== null;
  };

  const undoVertex = () => {
    if (!drawing || shape === GeometryKind.Point) {
      return false;
    }
    const geometry = sketchFeature?.getGeometry();
    const coordinate = geometry ? readLastConfirmedCoordinate(geometry) : null;
    if (!coordinate) {
      return false;
    }
    redoCoordinates.push(coordinate);
    internalVertexMutation = true;
    draw.removeLastPoint();
    internalVertexMutation = false;
    if (drawing) {
      emitState();
    }
    return true;
  };

  const redoVertex = () => {
    if (!active || shape === GeometryKind.Point) {
      return false;
    }
    const coordinate = redoCoordinates.pop();
    if (!coordinate) {
      return false;
    }
    internalVertexMutation = true;
    draw.appendCoordinates([coordinate]);
    internalVertexMutation = false;
    emitState();
    return true;
  };

  const detach = () => {
    abort();
    unbindGeometry();
    unbindDraw();
    map.removeInteraction(draw);
  };

  return {
    setActive,
    setShape,
    finish,
    undoVertex,
    redoVertex,
    discardRedo,
    abort,
    detach,
  };
}
