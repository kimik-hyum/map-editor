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

function sceneWith(layers: EditorSceneInput["layers"]): EditorSceneInput {
  return { version: 2, layers };
}

describe("normalizeSceneInput", () => {
  it("내부 EditorScene(version 1)으로 채운다", () => {
    const scene = normalizeSceneInput(
      sceneWith([{ features: [{ geometry: polygon() }] }]),
    );
    expect(scene.version).toBe(1);
    expect(scene.layers).toHaveLength(1);
  });

  it("id 미입력 시 결정적으로 생성한다", () => {
    const scene = normalizeSceneInput(
      sceneWith([{ features: [{ geometry: polygon() }] }]),
    );
    expect(scene.layers[0].id).toBe("layer-0");
    expect(scene.layers[0].features[0].id).toBe("layer-0-feature-0");
  });

  it("role 미입력은 editable, reference/background는 읽기 전용", () => {
    const scene = normalizeSceneInput(
      sceneWith([
        { features: [{ geometry: polygon() }] }, // role 없음 → editable
        { role: "reference", features: [{ geometry: polygon() }] },
        { role: "background", features: [{ geometry: polygon() }] },
      ]),
    );
    const [editable, reference, background] = scene.layers;
    expect(editable.behavior.editability).toBe(EditabilityState.Editable);
    expect(editable.behavior.lock).toBe(LockState.Unlocked);
    expect(editable.roles).toEqual([LayerRole.Editable]);
    expect(reference.behavior.editability).toBe(EditabilityState.Readonly);
    expect(reference.behavior.selectable).toBe(true);
    expect(background.behavior.selectable).toBe(false);
  });

  it("geometryKind를 geometry.type에서 파생한다", () => {
    const scene = normalizeSceneInput(
      sceneWith([
        {
          features: [
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
          ],
        },
      ]),
    );
    const kinds = scene.layers[0].features.map((f) => f.geometryKind);
    expect(kinds).toEqual([GeometryKind.Polygon, GeometryKind.MultiPolygon]);
  });

  it("열린 폴리곤 ring을 닫는다", () => {
    const scene = normalizeSceneInput(
      sceneWith([{ features: [{ geometry: polygon(false) }] }]),
    );
    const geom = scene.layers[0].features[0].feature.geometry;
    expect(geom.type).toBe("Polygon");
    if (geom.type === "Polygon") {
      const ring = geom.coordinates[0];
      expect(ring[ring.length - 1]).toEqual(ring[0]);
    }
  });

  it("state/view 기본값을 채우고 themeToken을 style로 옮긴다", () => {
    const scene = normalizeSceneInput(
      sceneWith([
        {
          features: [{ geometry: polygon(), themeToken: "editable", visible: false }],
        },
      ]),
    );
    const feature = scene.layers[0].features[0];
    expect(feature.state.selection).toBe(SelectionState.None);
    expect(feature.style?.themeToken).toBe("editable");
    expect(feature.view?.visibility).toBe(VisibilityState.Hidden);
  });
});
