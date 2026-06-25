import { z } from "zod";
import { featureInputSchema } from "../../../messaging/editorSceneSchema";
import type {
  DeepReadonly,
  EditorFeature,
  EditorFeatureInput,
  EditorPolygonInputGeometry,
  GeoJsonProperties,
} from "../../../types/editorTypes";

// 다른 에디터 창(심지어 다른 앱)과 시스템 클립보드로 공유하는 페이로드 포맷입니다.
// kind 판별자 + version으로 "우리 포맷"임을 식별하고, features는 INIT 입력과 같은 규칙으로 검증합니다.
// 순수 모듈입니다(React/OpenLayers/Zustand 미import).
export const EDITOR_CLIPBOARD_KIND = "maps-editor/features";
const CLIPBOARD_VERSION = 1;

const clipboardPayloadSchema = z.object({
  kind: z.literal(EDITOR_CLIPBOARD_KIND),
  version: z.literal(CLIPBOARD_VERSION),
  features: z.array(featureInputSchema),
});

// 복사 대상 도형에서 클립보드로 옮길 최소 필드만 뽑습니다.
// id/locked는 의도적으로 제외합니다 → 붙여넣을 때 새 고유 id가 생기고 편집 가능 상태가 됩니다.
export function featureToClipboardInput(
  feature: DeepReadonly<EditorFeature>,
): EditorFeatureInput {
  const input: EditorFeatureInput = {
    // store의 scene은 깊은 readonly다. 직렬화 직전이라 입력 도형으로 취급해도 안전하다.
    geometry: feature.feature.geometry as unknown as EditorPolygonInputGeometry,
  };

  if (feature.name !== undefined) {
    input.name = feature.name;
  }
  if (feature.style?.themeToken !== undefined) {
    input.themeToken = feature.style.themeToken;
  }
  if (feature.feature.properties !== undefined) {
    input.properties = feature.feature.properties as unknown as GeoJsonProperties;
  }

  return input;
}

// 도형 입력들을 클립보드 텍스트(JSON)로 직렬화합니다.
export function serializeClipboardPayload(features: EditorFeatureInput[]): string {
  return JSON.stringify({
    kind: EDITOR_CLIPBOARD_KIND,
    version: CLIPBOARD_VERSION,
    features,
  });
}

// 클립보드 텍스트를 우리 포맷으로 검증합니다. 우리 포맷이 아니거나 깨졌으면 null을 반환합니다
// (호출부는 네이티브 붙여넣기를 막지 않고 무시합니다).
export function parseClipboardPayload(text: string): EditorFeatureInput[] | null {
  if (!text) {
    return null;
  }

  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }

  const result = clipboardPayloadSchema.safeParse(data);
  if (!result.success) {
    return null;
  }

  return result.data.features as EditorFeatureInput[];
}
