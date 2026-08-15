import { GeometryKind, type DrawShape } from "@/pages/editor/types/editorTypes";

export type DrawKeyboardIntent = "cancel" | "finish" | null;

type ResolveDrawKeyboardIntentOptions = {
  key: string;
  shape: DrawShape;
  isDrawing: boolean;
  canFinish: boolean;
  confirmationOpen: boolean;
};

export function resolveDrawKeyboardIntent({
  key,
  shape,
  isDrawing,
  canFinish,
  confirmationOpen,
}: ResolveDrawKeyboardIntentOptions): DrawKeyboardIntent {
  if (!isDrawing || confirmationOpen) {
    return null;
  }

  if (key === "Escape") {
    return "cancel";
  }

  if (key === "Enter" && shape === GeometryKind.Path && canFinish) {
    return "finish";
  }

  return null;
}

export function resolveDrawHint(shape: DrawShape, isDrawing: boolean): string {
  if (shape === GeometryKind.Point) {
    return "클릭하여 마커 추가";
  }
  if (shape === GeometryKind.Path) {
    return isDrawing
      ? "점을 추가한 뒤 완료 버튼 또는 Enter로 완성하세요"
      : "클릭하여 패스 시작";
  }
  return isDrawing
    ? "정점을 추가하고 시작점을 클릭하여 완성하세요"
    : "클릭하여 폴리곤 시작";
}
