import { describe, expect, it } from "vitest";
import { EditAffordanceKind } from "@/pages/editor/types/editorTypes";
import { resolveMapHoverCursor } from "./mapCursorTheme";

describe("지도 호버 커서", () => {
  it.each([
    [false, null, "grab"],
    [true, null, "pointer"],
    [false, EditAffordanceKind.Delete, "move"],
    [true, EditAffordanceKind.Delete, "move"],
    [false, EditAffordanceKind.Insert, "crosshair"],
    [true, EditAffordanceKind.Insert, "crosshair"],
  ] as const)("선택 가능=%s, 편집 동작=%s → %s", (selectable, affordance, cursor) => {
    expect(resolveMapHoverCursor(selectable, affordance)).toBe(cursor);
  });
});
