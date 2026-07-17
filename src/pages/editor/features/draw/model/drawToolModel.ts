import { GeometryKind, type DrawShape } from "@/pages/editor/types/editorTypes";

export function resolveDrawHint(shape: DrawShape, isDrawing: boolean): string {
  if (shape === GeometryKind.Point) {
    return "클릭하여 마커 추가";
  }
  if (shape === GeometryKind.Path) {
    return isDrawing
      ? "점을 추가한 뒤 패스 완료 버튼을 누르세요"
      : "클릭하여 패스 시작";
  }
  return isDrawing
    ? "정점을 추가하고 시작점을 클릭하여 완성하세요"
    : "클릭하여 폴리곤 시작";
}
