import { describe, expect, it } from "vitest";
import type { DeepReadonly, EditorLayer } from "@/pages/editor/types/editorTypes";
import {
  getStackZIndexUpdates,
  getVisualStackOrder,
  moveLayerInStack,
  reorderLayerInStack,
} from "./layerReorderModel";

// 순서 계산에 필요한 최소 형태만 갖춘 레이어를 만듭니다.
function layerWith(id: string, zIndex: number): DeepReadonly<EditorLayer> {
  return { id, view: { zIndex } } as unknown as DeepReadonly<EditorLayer>;
}

// 시각 스택: a(30) 위, b(20) 가운데, c(10) 아래.
const layers = [layerWith("c", 10), layerWith("a", 30), layerWith("b", 20)];

describe("getVisualStackOrder", () => {
  it("쌓임 값 내림차순(위→아래)으로 나열한다", () => {
    expect(getVisualStackOrder(layers)).toEqual(["a", "b", "c"]);
  });

  it("동률이면 원본 순서를 유지한다", () => {
    const tied = [layerWith("x", 10), layerWith("y", 10)];
    expect(getVisualStackOrder(tied)).toEqual(["x", "y"]);
  });
});

describe("getStackZIndexUpdates", () => {
  it("맨 위 = 개수×10, 맨 아래 = 10으로 재부여한다", () => {
    expect(getStackZIndexUpdates(["a", "b", "c"])).toEqual([
      { layerId: "a", zIndex: 30 },
      { layerId: "b", zIndex: 20 },
      { layerId: "c", zIndex: 10 },
    ]);
  });
});

describe("moveLayerInStack", () => {
  it("가운데 행을 위로 올리면 순서가 바뀌고 전체가 재정규화된다", () => {
    expect(moveLayerInStack(layers, "b", "up")).toEqual([
      { layerId: "b", zIndex: 30 },
      { layerId: "a", zIndex: 20 },
      { layerId: "c", zIndex: 10 },
    ]);
  });

  it("맨 위 행은 위로, 맨 아래 행은 아래로 이동할 수 없다", () => {
    expect(moveLayerInStack(layers, "a", "up")).toBeNull();
    expect(moveLayerInStack(layers, "c", "down")).toBeNull();
  });

  it("없는 행이면 아무것도 하지 않는다", () => {
    expect(moveLayerInStack(layers, "missing", "up")).toBeNull();
  });

  it("호스트가 준 임의 값(동률 포함)도 이동 한 번에 깨끗해진다", () => {
    const messy = [layerWith("x", 5), layerWith("y", 5), layerWith("z", 100)];
    // 시각 순서: z(100), x(5), y(5). y를 위로 → z, y, x.
    expect(moveLayerInStack(messy, "y", "up")).toEqual([
      { layerId: "z", zIndex: 30 },
      { layerId: "y", zIndex: 20 },
      { layerId: "x", zIndex: 10 },
    ]);
  });
});

describe("reorderLayerInStack", () => {
  it("끌던 행을 대상 행 위치로 옮긴다(아래로)", () => {
    expect(reorderLayerInStack(layers, "a", "c")).toEqual([
      { layerId: "b", zIndex: 30 },
      { layerId: "c", zIndex: 20 },
      { layerId: "a", zIndex: 10 },
    ]);
  });

  it("끌던 행을 대상 행 위치로 옮긴다(위로)", () => {
    expect(reorderLayerInStack(layers, "c", "a")).toEqual([
      { layerId: "c", zIndex: 30 },
      { layerId: "a", zIndex: 20 },
      { layerId: "b", zIndex: 10 },
    ]);
  });

  it("같은 행 위 드롭이나 없는 행이면 아무것도 하지 않는다", () => {
    expect(reorderLayerInStack(layers, "a", "a")).toBeNull();
    expect(reorderLayerInStack(layers, "a", "missing")).toBeNull();
  });
});
