import area from "@turf/area";
import { describe, expect, it } from "vitest";
import {
  EditabilityState,
  FeatureLifecycle,
  GeometryKind,
  LayerRole,
  LockState,
  SelectionState,
  ValidationState,
  VisibilityState,
  type EditorCoordinate,
  type EditorFeature,
  type EditorLayer,
  type PolygonalGeometry,
} from "@/pages/editor/types/editorTypes";
import { subtractGeometry } from "../../geometry-ops/model/booleanOps";
import {
  fillSmallPolygonHoles,
  getHoleFillDisabledReason,
  inspectPolygonHoles,
} from "./holeFillModel";

function square(x: number, y: number, size: number): EditorCoordinate[] {
  return [
    [x, y],
    [x + size, y],
    [x + size, y + size],
    [x, y + size],
    [x, y],
  ];
}
const outer = square(126.97, 37.57, 0.01);
const small = square(126.971, 37.571, 0.0001);
const large = square(126.974, 37.574, 0.003);
const geometry: PolygonalGeometry = {
  type: "Polygon",
  coordinates: [outer, small, large],
};

describe("fillSmallPolygonHoles", () => {
  it("작은 구멍만 채우고 외곽선·큰 구멍·원본을 보존한다", () => {
    const before = structuredClone(geometry);
    const preview = fillSmallPolygonHoles(geometry, 1_000);
    expect(preview?.filledCount).toBe(1);
    expect(preview?.geometry).toEqual({ type: "Polygon", coordinates: [outer, large] });
    expect(preview?.addedAreaSquareMeters).toBeCloseTo(
      area({ type: "Polygon", coordinates: [small] }),
      4,
    );
    expect(geometry).toEqual(before);
  });
  it("경위도 기반 면적 기준에 정확히 같은 구멍도 포함한다", () => {
    const threshold = inspectPolygonHoles(geometry)?.[0].areaSquareMeters ?? 0;
    expect(fillSmallPolygonHoles(geometry, threshold - 0.000001)).toBeNull();
    expect(fillSmallPolygonHoles(geometry, threshold)?.filledCount).toBe(1);
  });
  it.each([0, -1, NaN, Infinity, -Infinity])(
    "잘못된 기준 %s는 전체 채우기로 해석하지 않는다",
    (threshold) => {
      expect(fillSmallPolygonHoles(geometry, threshold)).toBeNull();
    },
  );
  it("큰 기준으로 모든 내부 구멍을 채워도 외곽선은 그대로다", () => {
    expect(fillSmallPolygonHoles(geometry, 1_000_000)?.geometry).toEqual({
      type: "Polygon",
      coordinates: [outer],
    });
  });
  it("외부로 열린 틈은 내부 구멍으로 취급하지 않는다", () => {
    const openGap: PolygonalGeometry = {
      type: "Polygon",
      coordinates: [
        [
          [0, 0],
          [4, 0],
          [4, 4],
          [3, 4],
          [3, 1],
          [1, 1],
          [1, 4],
          [0, 4],
          [0, 0],
        ],
      ],
    };
    expect(inspectPolygonHoles(openGap)).toEqual([]);
    expect(fillSmallPolygonHoles(openGap, 1e12)).toBeNull();
  });
  it("멀티폴리곤의 다른 섬과 큰 구멍은 보존한다", () => {
    const island = square(126.99, 37.59, 0.001);
    const multi: PolygonalGeometry = {
      type: "MultiPolygon",
      coordinates: [[outer, small, large], [island]],
    };
    const preview = fillSmallPolygonHoles(multi, 1_000);
    expect(preview?.geometry.type).toBe("MultiPolygon");
    expect(inspectPolygonHoles(preview?.geometry ?? multi)).toHaveLength(1);
    expect(subtractGeometry(multi, preview?.geometry ?? multi)).toBeNull();
    expect(preview?.filledCount).toBe(1);
  });
  it("구멍 안의 섬을 중복 면으로 남기지 않고 실제 추가 면적만 계산한다", () => {
    const island = square(126.975, 37.575, 0.001);
    const multi: PolygonalGeometry = {
      type: "MultiPolygon",
      coordinates: [[outer, large], [island]],
    };
    const preview = fillSmallPolygonHoles(multi, 1_000_000);
    expect(preview?.geometry).toEqual({ type: "Polygon", coordinates: [outer] });
    const expected =
      area({ type: "Polygon", coordinates: [large] }) -
      area({ type: "Polygon", coordinates: [island] });
    expect(preview?.addedAreaSquareMeters).toBeCloseTo(expected, 3);
    expect(inspectPolygonHoles(preview?.addedGeometry ?? multi)).toHaveLength(1);
  });
  it("빈 도형, 미닫힘, 퇴화한 내부 ring과 잘못된 좌표를 거부한다", () => {
    const invalid: PolygonalGeometry[] = [
      { type: "Polygon", coordinates: [] },
      { type: "MultiPolygon", coordinates: [] },
      { type: "Polygon", coordinates: [outer.slice(0, -1), small] },
      {
        type: "Polygon",
        coordinates: [
          outer,
          [
            [1, 1],
            [2, 2],
            [1, 1],
          ],
        ],
      },
      {
        type: "Polygon",
        coordinates: [
          outer,
          [
            [181, 1],
            [182, 1],
            [182, 2],
            [181, 1],
          ],
        ],
      },
      {
        type: "Polygon",
        coordinates: [
          outer,
          [
            [NaN, 1],
            [2, 1],
            [2, 2],
            [NaN, 1],
          ],
        ],
      },
    ];
    for (const input of invalid) {
      expect(inspectPolygonHoles(input)).toBeNull();
      expect(fillSmallPolygonHoles(input, 1e12)).toBeNull();
    }
  });
});

function target() {
  const feature: EditorFeature = {
    id: "area",
    name: "권역",
    geometryKind: GeometryKind.Polygon,
    feature: { type: "Feature", geometry: structuredClone(geometry) },
    state: {
      selection: SelectionState.None,
      lifecycle: FeatureLifecycle.Clean,
      validation: ValidationState.Valid,
      issues: [],
    },
  };
  const layer: EditorLayer = {
    id: "layer",
    name: "권역",
    roles: [LayerRole.Editable],
    geometryKinds: [GeometryKind.Polygon],
    view: {
      visibility: VisibilityState.Visible,
      opacity: 1,
      zIndex: 1,
      labelVisible: true,
    },
    behavior: {
      lock: LockState.Unlocked,
      editability: EditabilityState.Editable,
      selectable: true,
      deletable: true,
      draggable: true,
    },
    features: [feature],
  };
  return { layer, feature };
}

describe("getHoleFillDisabledReason", () => {
  it("선택 여부와 관계없이 해당 행의 편집 가능한 폴리곤을 허용한다", () => {
    const { layer, feature } = target();
    expect(getHoleFillDisabledReason(layer, feature)).toBeNull();
  });
  it.each([
    "locked",
    "readonly",
    "hidden",
    "featureHidden",
    "vertexReadonly",
    "featureDisabled",
    "deleted",
    "invalid",
    "pending",
    "noHoles",
    "point",
    "line",
  ])("%s 상태는 이유와 함께 차단한다", (condition) => {
    const { layer, feature } = target();
    if (condition === "locked") layer.behavior.lock = LockState.Locked;
    if (condition === "readonly")
      layer.behavior.editability = EditabilityState.Readonly;
    if (condition === "hidden") layer.view.visibility = VisibilityState.Hidden;
    if (condition === "featureHidden")
      feature.view = { visibility: VisibilityState.Hidden };
    if (condition === "vertexReadonly") feature.behavior = { vertexEditable: false };
    if (condition === "featureDisabled")
      feature.behavior = { editability: EditabilityState.Disabled };
    if (condition === "deleted") feature.state.lifecycle = FeatureLifecycle.Deleted;
    if (condition === "invalid") feature.state.validation = ValidationState.Invalid;
    if (condition === "pending") feature.state.validation = ValidationState.Pending;
    if (condition === "noHoles")
      feature.feature.geometry = { type: "Polygon", coordinates: [outer] };
    if (condition === "point")
      feature.feature.geometry = { type: "Point", coordinates: [0, 0] };
    if (condition === "line")
      feature.feature.geometry = {
        type: "LineString",
        coordinates: [
          [0, 0],
          [1, 1],
        ],
      };
    expect(getHoleFillDisabledReason(layer, feature)).toEqual(expect.any(String));
  });
});
