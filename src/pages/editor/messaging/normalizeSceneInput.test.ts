import { describe, expect, it } from "vitest";
import {
  EditabilityState,
  GeometryKind,
  LayerRole,
  LockState,
  SelectionState,
  VisibilityState,
} from "../types/editorTypes";
import type {
  EditorPolygonInputGeometry,
  EditorSceneInput,
} from "../types/editorTypes";
import { normalizeSceneInput } from "./normalizeSceneInput";

// 열린 폴리곤(닫지 않은 ring)을 기본으로 반환합니다(normalizer가 닫는지 확인하기 위함).
function polygon(closed = false): EditorPolygonInputGeometry {
  return {
    type: "Polygon",
    coordinates: closed
      ? [
          [
            [0, 0],
            [0, 1],
            [1, 1],
            [0, 0],
          ],
        ]
      : [
          [
            [0, 0],
            [0, 1],
            [1, 1],
          ],
        ],
  };
}

function sceneWith(features: EditorSceneInput["features"]): EditorSceneInput {
  return { version: 2, features };
}

describe("normalizeSceneInput", () => {
  it("도형 하나당 내부 레이어 하나로 펼친다(1레이어 = 1도형)", () => {
    const scene = normalizeSceneInput(
      sceneWith([{ geometry: polygon() }, { geometry: polygon() }]),
    );
    expect(scene.version).toBe(1);
    expect(scene.layers).toHaveLength(2);
    expect(scene.layers[0].features).toHaveLength(1);
    expect(scene.layers[1].features).toHaveLength(1);
  });

  it("id 미입력 시 결정적으로 생성하고, 레이어 id는 도형 id에서 파생한다", () => {
    const scene = normalizeSceneInput(sceneWith([{ geometry: polygon() }]));
    expect(scene.layers[0].features[0].id).toBe("feature-0");
    expect(scene.layers[0].id).toBe("layer-feature-0");
  });

  it("배열 순서 = 그리는 순서: 뒤에 있는 도형이 더 높은 쌓임 값을 가진다", () => {
    const scene = normalizeSceneInput(
      sceneWith([
        { id: "bottom", geometry: polygon() },
        { id: "top", geometry: polygon() },
      ]),
    );
    const [bottom, top] = scene.layers;
    expect(top.view.zIndex).toBeGreaterThan(bottom.view.zIndex);
  });

  it("잠금 미입력은 편집 가능, 잠금은 읽기 전용·참고 역할", () => {
    const scene = normalizeSceneInput(
      sceneWith([{ geometry: polygon() }, { locked: true, geometry: polygon() }]),
    );
    const [editable, locked] = scene.layers;
    expect(editable.behavior.editability).toBe(EditabilityState.Editable);
    expect(editable.behavior.lock).toBe(LockState.Unlocked);
    expect(editable.roles).toEqual([LayerRole.Editable]);
    expect(locked.behavior.editability).toBe(EditabilityState.Readonly);
    expect(locked.behavior.lock).toBe(LockState.Locked);
    expect(locked.behavior.selectable).toBe(true);
    expect(locked.roles).toEqual([LayerRole.Reference]);
  });

  it("geometryKind를 geometry.type에서 파생한다", () => {
    const scene = normalizeSceneInput(
      sceneWith([
        { geometry: polygon() },
        {
          geometry: {
            type: "MultiPolygon",
            coordinates: [
              [
                [
                  [0, 0],
                  [0, 1],
                  [1, 1],
                  [0, 0],
                ],
              ],
            ],
          },
        },
      ]),
    );
    expect(scene.layers.map((layer) => layer.features[0].geometryKind)).toEqual([
      GeometryKind.Polygon,
      GeometryKind.MultiPolygon,
    ]);
  });

  it("열린 폴리곤 ring을 닫는다", () => {
    const scene = normalizeSceneInput(sceneWith([{ geometry: polygon(false) }]));
    const geom = scene.layers[0].features[0].feature.geometry;
    expect(geom.type).toBe("Polygon");
    if (geom.type === "Polygon") {
      const ring = geom.coordinates[0];
      expect(ring[ring.length - 1]).toEqual(ring[0]);
    }
  });

  it("기본 상태를 채우고 표시·테마 입력을 반영한다", () => {
    const scene = normalizeSceneInput(
      sceneWith([
        { geometry: polygon(), themeToken: "editable", visible: false, name: "가" },
      ]),
    );
    const layer = scene.layers[0];
    const feature = layer.features[0];
    expect(feature.state.selection).toBe(SelectionState.None);
    expect(feature.style?.themeToken).toBe("editable");
    expect(layer.view.visibility).toBe(VisibilityState.Hidden);
    expect(layer.name).toBe("가");
  });
});
