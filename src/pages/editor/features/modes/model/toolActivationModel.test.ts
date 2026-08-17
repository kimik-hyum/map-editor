import { describe, expect, it } from "vitest";
import { EditorMode } from "@/pages/editor/types/editorTypes";
import { getToolActivation } from "./toolActivationModel";

describe("getToolActivation", () => {
  it("Select 모드에서는 선택·정점·도형 연산만 활성화한다", () => {
    expect(getToolActivation(EditorMode.Select)).toEqual({
      selection: true,
      vertexEdit: true,
      affordance: true,
      geometryOps: true,
      draw: false,
      boundary: false,
      radius: false,
    });
  });

  it.each([
    [EditorMode.Draw, "draw"],
    [EditorMode.Boundary, "boundary"],
    [EditorMode.Radius, "radius"],
  ] as const)("%s 모드는 자기 controller만 활성화한다", (mode, activeKey) => {
    const activation = getToolActivation(mode);
    expect(activation[activeKey]).toBe(true);
    expect(
      Object.entries(activation)
        .filter(([key]) => key !== activeKey)
        .every(([, value]) => value === false),
    ).toBe(true);
  });
});
