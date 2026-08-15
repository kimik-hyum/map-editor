import markerCursorUrl from "@/assets/cursors/draw-marker.svg";
import pathCursorUrl from "@/assets/cursors/draw-path.svg";
import polygonCursorUrl from "@/assets/cursors/draw-polygon.svg";
import { GeometryKind, type DrawShape } from "@/pages/editor/types/editorTypes";

const DRAW_CURSOR_BY_SHAPE = {
  [GeometryKind.Polygon]: `url("${polygonCursorUrl}") 7 7, crosshair`,
  [GeometryKind.Path]: `url("${pathCursorUrl}") 7 7, crosshair`,
  // 마커 좌표는 핀의 뾰족한 끝과 일치합니다.
  [GeometryKind.Point]: `url("${markerCursorUrl}") 13 30, crosshair`,
} satisfies Record<DrawShape, string>;

export function resolveDrawCursor(shape: DrawShape): string {
  return DRAW_CURSOR_BY_SHAPE[shape];
}
