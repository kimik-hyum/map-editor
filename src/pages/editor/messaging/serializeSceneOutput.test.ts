import { describe, expect, it } from "vitest";
import {
  FeatureLifecycle,
  LockState,
  VisibilityState,
  type EditorScene,
  type EditorSceneInput,
} from "../types/editorTypes";
import { normalizeSceneInput } from "./normalizeSceneInput";
import { serializeSceneOutput } from "./serializeSceneOutput";

const input: EditorSceneInput = {
  version: 2,
  id: "round-trip-scene",
  name: "왕복 테스트",
  viewport: { center: [127, 37.5], zoom: 12 },
  features: [
    {
      id: "feature-a",
      name: "A",
      geometry: { type: "Point", coordinates: [127, 37.5] },
      themeToken: "editable",
      properties: { sourceId: 10 },
    },
    {
      id: "feature-b",
      name: "B",
      geometry: { type: "Point", coordinates: [127.1, 37.6] },
      locked: true,
    },
  ],
};

describe("serializeSceneOutput", () => {
  it("내부 레이어를 제거하고 현재 zIndex 순서·표시·잠금을 공개 v2 형식으로 직렬화한다", () => {
    const normalized = normalizeSceneInput(input);
    const scene: EditorScene = {
      ...normalized,
      layers: [
        {
          ...normalized.layers[0],
          view: {
            ...normalized.layers[0].view,
            zIndex: 100,
            visibility: VisibilityState.Hidden,
          },
        },
        {
          ...normalized.layers[1],
          view: { ...normalized.layers[1].view, zIndex: 10 },
        },
      ],
    };

    const output = serializeSceneOutput(scene);

    expect(output).toEqual({
      version: 2,
      id: "round-trip-scene",
      name: "왕복 테스트",
      viewport: { center: [127, 37.5], zoom: 12 },
      features: [
        {
          id: "feature-b",
          name: "B",
          geometry: { type: "Point", coordinates: [127.1, 37.6] },
          locked: true,
          visible: true,
          properties: { label: "B" },
        },
        {
          id: "feature-a",
          name: "A",
          geometry: { type: "Point", coordinates: [127, 37.5] },
          locked: false,
          visible: false,
          themeToken: "editable",
          properties: { sourceId: 10 },
        },
      ],
    });
    expect(output).not.toHaveProperty("layers");
  });

  it("삭제 lifecycle 도형과 내부 전용 viewport 필드를 반환하지 않는다", () => {
    const normalized = normalizeSceneInput(input);
    const scene: EditorScene = {
      ...normalized,
      viewport: { fitFeatureIds: ["feature-a"] },
      layers: [
        {
          ...normalized.layers[0],
          behavior: { ...normalized.layers[0].behavior, lock: LockState.Unlocked },
          features: [
            {
              ...normalized.layers[0].features[0],
              state: {
                ...normalized.layers[0].features[0].state,
                lifecycle: FeatureLifecycle.Deleted,
              },
            },
          ],
        },
      ],
    };

    expect(serializeSceneOutput(scene)).toEqual({
      version: 2,
      id: "round-trip-scene",
      name: "왕복 테스트",
      features: [],
    });
  });
});
