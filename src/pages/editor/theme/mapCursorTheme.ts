import { EditAffordanceKind } from "@/pages/editor/types/editorTypes";

export type MapHoverCursor = "grab" | "pointer" | "move" | "crosshair";

// 실제 선택·정점 판정을 재사용하고, 표현 우선순위만 결정합니다.
export function resolveMapHoverCursor(
  selectable: boolean,
  affordance: EditAffordanceKind | null,
): MapHoverCursor {
  if (affordance === EditAffordanceKind.Delete) return "move";
  if (affordance === EditAffordanceKind.Insert) return "crosshair";
  return selectable ? "pointer" : "grab";
}
