import circle from "@turf/circle";
import type {
  DeepReadonly,
  EditorCoordinate,
  EditorScene,
  GeoJsonGeometry,
} from "@/pages/editor/types/editorTypes";

export const DEFAULT_RADIUS_KM = "1";
export const MIN_RADIUS_KM = 0.01;
export const MAX_RADIUS_KM = 1_000;
export const UNSUPPORTED_RADIUS_GEOGRAPHY_ERROR =
  "날짜변경선 또는 극점을 지나는 반경은 현재 지원하지 않습니다. 반경을 줄여주세요.";

// 원호와 직선 변 사이의 최대 오차를 5m 이내로 맞춥니다. 작은 원도 매끄럽게 보이도록
// 최소 64개를 쓰고, 비정상적으로 큰 payload를 막기 위해 최대 1,024개로 제한합니다.
const CIRCLE_MAX_EDGE_ERROR_METERS = 5;
const MIN_CIRCLE_STEPS = 64;
const MAX_CIRCLE_STEPS = 1_024;

export type RadiusTarget = {
  featureId: string;
  name: string;
  center: EditorCoordinate;
};

export type RadiusTargetResult =
  | { target: RadiusTarget; error: null }
  | { target: null; error: string };

export type RadiusValidationResult =
  | { valid: true; valueKm: number; label: string; error: null }
  | { valid: false; valueKm: null; label: null; error: string };

function getFeatureName(
  feature: DeepReadonly<EditorScene>["layers"][number]["features"][number],
) {
  const propertyLabel = feature.feature.properties?.label;
  if (feature.name) {
    return feature.name;
  }
  return typeof propertyLabel === "string" && propertyLabel.trim().length > 0
    ? propertyLabel
    : "선택한 마커";
}

// 반경 도구의 기준점은 전체 선택이 정확히 하나이고 그 geometry가 Point일 때만 확정됩니다.
export function resolveRadiusTarget(
  scene: DeepReadonly<EditorScene> | null,
  selectedFeatureIds: readonly string[],
): RadiusTargetResult {
  if (!scene || selectedFeatureIds.length === 0) {
    return { target: null, error: "지도 또는 레이어에서 마커 한 개를 선택하세요." };
  }
  if (selectedFeatureIds.length !== 1) {
    return { target: null, error: "반경의 기준이 될 마커 한 개만 선택하세요." };
  }

  const selectedId = selectedFeatureIds[0];
  for (const layer of scene.layers) {
    const feature = layer.features.find((candidate) => candidate.id === selectedId);
    if (!feature) {
      continue;
    }
    const geometry = feature.feature.geometry;
    if (geometry.type !== "Point") {
      return { target: null, error: "선택한 도형은 마커가 아닙니다." };
    }
    const [longitude, latitude] = geometry.coordinates;
    if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
      return { target: null, error: "선택한 마커의 좌표가 올바르지 않습니다." };
    }
    return {
      target: {
        featureId: feature.id,
        name: getFeatureName(feature),
        center: [longitude, latitude],
      },
      error: null,
    };
  }

  return { target: null, error: "선택한 마커를 현재 씬에서 찾을 수 없습니다." };
}

// 지도 히트테스트가 위에 덮인 폴리곤을 건너뛰고 Point만 찾을 수 있도록 쓰는 판정입니다.
// 잠긴 참조 마커도 좌표 기준점으로는 허용하는 resolveRadiusTarget 정책을 그대로 공유합니다.
export function canUseAsRadiusTarget(
  scene: DeepReadonly<EditorScene>,
  featureId: string,
): boolean {
  return resolveRadiusTarget(scene, [featureId]).target !== null;
}

export function validateRadiusInput(draft: string): RadiusValidationResult {
  const value = draft.trim();
  if (value.length === 0) {
    return { valid: false, valueKm: null, label: null, error: "반경을 입력하세요." };
  }
  if (!/^\d+(?:\.\d{0,2})?$/.test(value)) {
    const error = /^\d+\.\d+$/.test(value)
      ? "소수점 이하 두 자리까지만 입력할 수 있습니다."
      : "반경을 숫자로 입력하세요.";
    return { valid: false, valueKm: null, label: null, error };
  }

  const valueKm = Number(value);
  if (!Number.isFinite(valueKm) || valueKm < MIN_RADIUS_KM) {
    return {
      valid: false,
      valueKm: null,
      label: null,
      error: `반경은 ${MIN_RADIUS_KM}km 이상이어야 합니다.`,
    };
  }
  if (valueKm > MAX_RADIUS_KM) {
    return {
      valid: false,
      valueKm: null,
      label: null,
      error: `반경은 ${MAX_RADIUS_KM.toLocaleString("ko-KR")}km 이하여야 합니다.`,
    };
  }

  return {
    valid: true,
    valueKm,
    label: valueKm
      .toFixed(2)
      .replace(/\.00$/, "")
      .replace(/(\.\d)0$/, "$1"),
    error: null,
  };
}

export function resolveRadiusCircleSteps(radiusKm: number) {
  const radiusMeters = radiusKm * 1_000;
  const cosine = Math.max(
    -1,
    Math.min(1, 1 - CIRCLE_MAX_EDGE_ERROR_METERS / radiusMeters),
  );
  const halfAngle = Math.acos(cosine);
  const calculated =
    halfAngle === 0 ? MAX_CIRCLE_STEPS : Math.ceil(Math.PI / halfAngle);
  return Math.max(MIN_CIRCLE_STEPS, Math.min(MAX_CIRCLE_STEPS, calculated));
}

// GeoJSON 저장 좌표(WGS84)에서 지표면 거리 기준 원을 만듭니다. OpenLayers 투영 원을
// 역변환하지 않아 위도에 따른 Web Mercator 거리 왜곡이 저장 geometry에 섞이지 않습니다.
export function createRadiusCircleGeometry(
  center: EditorCoordinate,
  radiusKm: number,
): GeoJsonGeometry {
  const result = circle([center[0], center[1]], radiusKm, {
    units: "kilometers",
    steps: resolveRadiusCircleSteps(radiusKm),
  });

  return {
    type: "Polygon",
    coordinates: result.geometry.coordinates.map((ring) =>
      ring.map((coordinate) => [coordinate[0], coordinate[1]] as EditorCoordinate),
    ),
  };
}

// 현재 GeoJSON/OpenLayers 경계는 경도 -180~180 안에서 날짜변경선을 가로지르지 않는 ring을
// 전제로 합니다. Turf가 만든 원이 그 경계를 넘으면 저장은 되더라도 다음 INIT 검증에 실패하거나
// 지도 반대편을 가로지르는 면으로 렌더될 수 있으므로 scene에 넣기 전에 명시적으로 거부합니다.
export function getRadiusCircleGeometryError(geometry: GeoJsonGeometry): string | null {
  if (geometry.type !== "Polygon") {
    return UNSUPPORTED_RADIUS_GEOGRAPHY_ERROR;
  }

  for (const ring of geometry.coordinates) {
    for (let index = 0; index < ring.length; index += 1) {
      const coordinate = ring[index];
      const previous = index > 0 ? ring[index - 1] : null;
      if (
        !Number.isFinite(coordinate[0]) ||
        !Number.isFinite(coordinate[1]) ||
        coordinate[0] < -180 ||
        coordinate[0] > 180 ||
        coordinate[1] < -90 ||
        coordinate[1] > 90 ||
        (previous !== null && Math.abs(coordinate[0] - previous[0]) > 180)
      ) {
        return UNSUPPORTED_RADIUS_GEOGRAPHY_ERROR;
      }
    }
  }

  return null;
}
