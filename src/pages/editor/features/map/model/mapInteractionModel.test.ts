import { describe, expect, it } from "vitest";
import { EditorMode } from "@/pages/editor/types/editorTypes";
import { getMapInteractionActivation } from "./mapInteractionModel";

describe("getMapInteractionActivation", () => {
  it("Select 모드는 편집 계열을 모두 켠다", () => {
    expect(getMapInteractionActivation(EditorMode.Select)).toEqual({
      selection: true,
      vertexEdit: true,
      affordance: true,
    });
  });

  it("Draw/Boundary/Radius 모드는 편집 계열을 모두 끈다(게이팅)", () => {
    for (const mode of [EditorMode.Draw, EditorMode.Boundary, EditorMode.Radius]) {
      expect(getMapInteractionActivation(mode)).toEqual({
        selection: false,
        vertexEdit: false,
        affordance: false,
      });
    }
  });
});
