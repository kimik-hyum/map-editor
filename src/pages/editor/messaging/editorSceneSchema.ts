import { z } from "zod";
import { editorDefaultTheme } from "../theme/editorTheme";
import {
  EditorMessageType,
  ValidationIssueCode,
  type EditorInitMessage,
  type EditorSceneInput,
  type EditorValidationIssue,
} from "../types/editorTypes";
import { findDuplicateIds, normalizeSceneInput } from "./normalizeSceneInput";

// 호스트가 보내는 "최소 입력"(EditorSceneInput, v2)의 런타임 구조를 Zod로 검증한 뒤
// normalizeSceneInput으로 내부 EditorScene(리치 모델)으로 변환합니다.
// 즉 검증 경계(이 파일)와 기본값 채움(normalizeSceneInput)을 분리합니다.

const coordinateSchema = z.tuple([z.number(), z.number()]);

// 현재 에디터는 폴리곤 계열만 렌더합니다. path/point 렌더가 열리면 여기에 추가합니다.
// (입력 허용 범위 = 실제 지원 범위를 일치시켜 "통과하지만 안 보이는" 상황을 막습니다.)
const geometrySchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("Polygon"),
    coordinates: z.array(z.array(coordinateSchema)),
  }),
  z.object({
    type: z.literal("MultiPolygon"),
    coordinates: z.array(z.array(z.array(coordinateSchema))),
  }),
]);

const themeTokenSchema = z.enum(
  Object.keys(editorDefaultTheme.polygon) as [string, ...string[]],
);

const featureInputSchema = z.object({
  geometry: geometrySchema,
  id: z.string().optional(),
  name: z.string().optional(),
  visible: z.boolean().optional(),
  themeToken: themeTokenSchema.optional(),
  properties: z.record(z.string(), z.unknown()).optional(),
});

const layerInputSchema = z.object({
  features: z.array(featureInputSchema),
  id: z.string().optional(),
  name: z.string().optional(),
  role: z.enum(["editable", "reference", "background"]).optional(),
  zIndex: z.number().optional(),
  visible: z.boolean().optional(),
  opacity: z.number().optional(),
});

export const editorSceneInputSchema = z.object({
  version: z.literal(2),
  layers: z.array(layerInputSchema),
  id: z.string().optional(),
  name: z.string().optional(),
  viewport: z
    .object({ center: coordinateSchema.optional(), zoom: z.number().optional() })
    .optional(),
});

const initInputSchema = z.object({
  type: z.literal(EditorMessageType.Init),
  sessionId: z.string(),
  scene: editorSceneInputSchema,
});

export type ParseInitMessageResult =
  | { ok: true; message: EditorInitMessage }
  | { ok: false; message: string; issues: EditorValidationIssue[] };

// 임의의 postMessage 데이터를 검증 + normalize해 내부 EditorInitMessage로 만듭니다.
export function parseInitMessage(data: unknown): ParseInitMessageResult {
  const result = initInputSchema.safeParse(data);

  if (result.success) {
    const { type, sessionId, scene } = result.data;
    const normalized = normalizeSceneInput(scene as EditorSceneInput);

    // 피처/레이어 id는 선택·수정의 전역 키이므로 중복이면 거부한다(명시 id 충돌 + 자동 생성 충돌).
    const duplicates = findDuplicateIds(normalized);
    if (duplicates.length > 0) {
      return {
        ok: false,
        message: "scene에 중복된 id가 있습니다.",
        issues: duplicates.map((id) => ({
          code: ValidationIssueCode.InvalidPayload,
          message: `중복 id: ${id}`,
        })),
      };
    }

    return { ok: true, message: { type, sessionId, scene: normalized } };
  }

  const issues: EditorValidationIssue[] = result.error.issues.map((issue) => ({
    code: ValidationIssueCode.InvalidPayload,
    message: `${issue.path.join(".") || "(root)"}: ${issue.message}`,
  }));

  return { ok: false, message: "초기화 메시지 검증에 실패했습니다.", issues };
}
