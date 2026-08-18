import { describe, expect, it } from "vitest";
import { normalizeSceneInput } from "@/pages/editor/messaging/normalizeSceneInput";
import {
  createRadiusCircleGeometry,
  MAX_RADIUS_KM,
  resolveRadiusCircleSteps,
  resolveRadiusTarget,
  validateRadiusInput,
} from "./radiusToolModel";

const scene = normalizeSceneInput({
  version: 2,
  features: [
    {
      id: "marker",
      name: "기준 마커",
      locked: true,
      geometry: { type: "Point", coordinates: [126.98, 37.56] },
    },
    {
      id: "polygon",
      name: "기존 권역",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [126.9, 37.5],
            [127, 37.5],
            [127, 37.6],
            [126.9, 37.5],
          ],
        ],
      },
    },
  ],
});

function haversineDistanceKm(
  from: readonly [number, number],
  to: readonly [number, number],
) {
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeDelta = radians(to[1] - from[1]);
  const longitudeDelta = radians(to[0] - from[0]);
  const fromLatitude = radians(from[1]);
  const toLatitude = radians(to[1]);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(fromLatitude) * Math.cos(toLatitude) * Math.sin(longitudeDelta / 2) ** 2;
  return 6_371.0088 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

describe("resolveRadiusTarget", () => {
  it("잠긴 마커도 좌표 참조 대상으로 허용한다", () => {
    expect(resolveRadiusTarget(scene, ["marker"])).toEqual({
      target: {
        featureId: "marker",
        name: "기준 마커",
        center: [126.98, 37.56],
      },
      error: null,
    });
  });

  it("미선택·다중 선택·Point가 아닌 선택을 구분한다", () => {
    expect(resolveRadiusTarget(scene, []).error).toContain("마커 한 개");
    expect(resolveRadiusTarget(scene, ["marker", "polygon"]).error).toContain(
      "한 개만",
    );
    expect(resolveRadiusTarget(scene, ["polygon"]).error).toContain("마커가 아닙니다");
  });
});

describe("validateRadiusInput", () => {
  it.each([
    ["0.01", 0.01, "0.01"],
    ["1", 1, "1"],
    ["1.2", 1.2, "1.2"],
    ["1.23", 1.23, "1.23"],
    ["1.", 1, "1"],
  ])("%s km 입력을 허용한다", (draft, valueKm, label) => {
    expect(validateRadiusInput(draft)).toEqual({
      valid: true,
      valueKm,
      label,
      error: null,
    });
  });

  it.each(["", "0", "-1", "1.234", "1e2", "NaN"])("%s 입력을 거부한다", (draft) => {
    expect(validateRadiusInput(draft).valid).toBe(false);
  });

  it("안전 상한을 초과한 값을 거부한다", () => {
    expect(validateRadiusInput(String(MAX_RADIUS_KM + 0.01)).valid).toBe(false);
  });
});

describe("createRadiusCircleGeometry", () => {
  it("닫힌 GeoJSON Polygon을 만들고 반경에 따라 근사 정점 수를 조절한다", () => {
    const geometry = createRadiusCircleGeometry([126.98, 37.56], 1);
    expect(geometry.type).toBe("Polygon");
    if (geometry.type !== "Polygon") {
      throw new Error("Polygon이 필요합니다.");
    }
    expect(geometry.coordinates).toHaveLength(1);
    expect(geometry.coordinates[0]).toHaveLength(resolveRadiusCircleSteps(1) + 1);
    expect(geometry.coordinates[0][0]).toEqual(
      geometry.coordinates[0][geometry.coordinates[0].length - 1],
    );
    expect(
      haversineDistanceKm([126.98, 37.56], geometry.coordinates[0][0]),
    ).toBeCloseTo(1, 5);
    expect(resolveRadiusCircleSteps(MAX_RADIUS_KM)).toBeGreaterThan(
      resolveRadiusCircleSteps(1),
    );
  });
});
