import Polygon from "ol/geom/Polygon";
import { fromLonLat } from "ol/proj";
import { describe, expect, it } from "vitest";
import {
  EditabilityState,
  type EditorScene,
  type GeoJsonGeometry,
  LockState,
  VisibilityState,
} from "@/pages/editor/types/editorTypes";
import {
  isLayerVertexEditable,
  normalizeClosedRings,
  olGeometryToEditorGeometry,
} from "./attachVertexModify";

function sceneWithLayer(behavior: {
  visibility: VisibilityState;
  editability: EditabilityState;
  lock: LockState;
}): EditorScene {
  return {
    layers: [
      {
        id: "layer-1",
        view: { visibility: behavior.visibility },
        behavior: { editability: behavior.editability, lock: behavior.lock },
        features: [],
      },
    ],
  } as unknown as EditorScene;
}

describe("isLayerVertexEditable", () => {
  it("보임 + 편집 가능 + 잠금 해제면 true", () => {
    const scene = sceneWithLayer({
      visibility: VisibilityState.Visible,
      editability: EditabilityState.Editable,
      lock: LockState.Unlocked,
    });
    expect(isLayerVertexEditable(scene, "layer-1")).toBe(true);
  });

  it("숨김/잠금/읽기전용이면 false", () => {
    const hidden = sceneWithLayer({
      visibility: VisibilityState.Hidden,
      editability: EditabilityState.Editable,
      lock: LockState.Unlocked,
    });
    const locked = sceneWithLayer({
      visibility: VisibilityState.Visible,
      editability: EditabilityState.Editable,
      lock: LockState.Locked,
    });
    const readonly = sceneWithLayer({
      visibility: VisibilityState.Visible,
      editability: EditabilityState.Readonly,
      lock: LockState.Unlocked,
    });
    expect(isLayerVertexEditable(hidden, "layer-1")).toBe(false);
    expect(isLayerVertexEditable(locked, "layer-1")).toBe(false);
    expect(isLayerVertexEditable(readonly, "layer-1")).toBe(false);
  });

  it("없는 레이어면 false", () => {
    const scene = sceneWithLayer({
      visibility: VisibilityState.Visible,
      editability: EditabilityState.Editable,
      lock: LockState.Unlocked,
    });
    expect(isLayerVertexEditable(scene, "missing")).toBe(false);
  });
});

describe("normalizeClosedRings", () => {
  it("열린 폴리곤 링의 마지막 좌표를 첫 좌표로 닫는다", () => {
    const open = {
      type: "Polygon",
      coordinates: [
        [
          [0, 0],
          [0, 1],
          [1, 1],
        ],
      ],
    } as GeoJsonGeometry;

    const result = normalizeClosedRings(open);
    expect(result.type).toBe("Polygon");
    if (result.type === "Polygon") {
      const ring = result.coordinates[0];
      expect(ring).toHaveLength(4);
      expect(ring[ring.length - 1]).toEqual(ring[0]);
    }
  });

  it("이미 닫힌 링은 그대로 둔다", () => {
    const closed = {
      type: "Polygon",
      coordinates: [
        [
          [0, 0],
          [0, 1],
          [1, 1],
          [0, 0],
        ],
      ],
    } as GeoJsonGeometry;

    const result = normalizeClosedRings(closed);
    if (result.type === "Polygon") {
      expect(result.coordinates[0]).toHaveLength(4);
    }
  });

  it("폴리곤이 아니면 그대로 둔다", () => {
    const line = {
      type: "LineString",
      coordinates: [
        [0, 0],
        [1, 1],
      ],
    } as GeoJsonGeometry;
    expect(normalizeClosedRings(line)).toBe(line);
  });
});

describe("olGeometryToEditorGeometry", () => {
  it("OL 폴리곤(3857)을 경위도 GeoJSON으로 변환하고 링을 닫는다", () => {
    const polygon = new Polygon([
      [
        fromLonLat([126.9, 37.5]),
        fromLonLat([126.9, 37.6]),
        fromLonLat([127.0, 37.6]),
        fromLonLat([126.9, 37.5]),
      ],
    ]);

    const result = olGeometryToEditorGeometry(polygon);
    expect(result.type).toBe("Polygon");
    if (result.type === "Polygon") {
      const ring = result.coordinates[0];
      // 닫힘 보장.
      expect(ring[ring.length - 1]).toEqual(ring[0]);
      // 경위도로 복원(근사).
      expect(ring[0][0]).toBeCloseTo(126.9, 5);
      expect(ring[0][1]).toBeCloseTo(37.5, 5);
    }
  });
});
