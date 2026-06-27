import { z } from "zod";
import { featureInputSchema } from "../../../messaging/editorSceneSchema";
import type {
  DeepReadonly,
  EditorFeature,
  EditorFeatureInput,
  EditorPolygonInputGeometry,
  EditorScene,
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

// 선택된 도형들을 "시각 스택 아래→위(zIndex 오름차순)" 순서로 클립보드 입력으로 모읍니다.
// scene.layers 배열 순서는 패널 재정렬(zIndex만 변경, 배열 순서 불변) 후 시각 순서와 어긋나므로
// 배열 순서로 모으면 안 됩니다. 시각 스택과 같은 규칙(zIndex 기준, 동률은 배열 순서)으로 정렬합니다.
// addFeaturesToScene는 입력 순서대로 zIndex를 올려 부여하므로, 아래→위로 넘기면 원래 위·아래 관계가 보존됩니다.
export function collectClipboardInputs(
  scene: DeepReadonly<EditorScene>,
  selectedFeatureIds: readonly string[],
): EditorFeatureInput[] {
  const selected = new Set(selectedFeatureIds);
  const picked: Array<{
    zIndex: number;
    order: number;
    feature: DeepReadonly<EditorFeature>;
  }> = [];

  scene.layers.forEach((layer, layerIndex) => {
    for (const feature of layer.features) {
      if (selected.has(feature.id)) {
        picked.push({ zIndex: layer.view.zIndex, order: layerIndex, feature });
      }
    }
  });

  picked.sort((a, b) =>
    a.zIndex === b.zIndex ? a.order - b.order : a.zIndex - b.zIndex,
  );

  return picked.map((entry) => featureToClipboardInput(entry.feature));
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
