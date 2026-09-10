import type { PolygonalGeometry } from "@/pages/editor/types/editorTypes";

// 권역 C → 삼청동 → 계동 병합 실패에서 오류를 유지하며 축소한 좌표 조각입니다.
// 각 입력은 유효하지만 Turf 7.3.5 union이 2점짜리 내부 ring을 생성합니다.
export const UNION_REGRESSION_TARGET: PolygonalGeometry = {
  type: "Polygon",
  coordinates: [
    [
      [126.974, 37.581],
      [126.986, 37.588014],
      [126.986, 37.58845828571429],
      [126.986115, 37.588594],
      [126.974, 37.581],
    ],
  ],
};

export const UNION_REGRESSION_BOUNDARY: PolygonalGeometry = {
  type: "MultiPolygon",
  coordinates: [
    [
      [
        [126.98592, 37.588344],
        [126.986067, 37.588554],
        [126.986115, 37.588594],
        [126.98592, 37.588344],
      ],
    ],
  ],
};
