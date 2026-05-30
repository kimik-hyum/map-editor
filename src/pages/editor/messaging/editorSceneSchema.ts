import { z } from "zod";
import { editorDefaultTheme } from "../theme/editorTheme";
import {
  EditabilityState,
  EditorMessageType,
  FeatureLifecycle,
  GeometryKind,
  LayerRole,
  LockState,
  SelectionState,
  ValidationIssueCode,
  ValidationState,
  VisibilityState,
  type EditorInitMessage,
  type EditorValidationIssue,
} from "../types/editorTypes";

// postMessage로 들어온 EditorScene/EditorInitMessage의 런타임 구조를 Zod로 검증합니다.
// 손으로 작성한 도메인 타입이 단일 소스이므로, 검증 통과 결과는 EditorInitMessage로 단언해 사용합니다.

const coordinateSchema = z.tuple([z.number(), z.number()]);

const geometrySchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("Point"), coordinates: coordinateSchema }),
  z.object({ type: z.literal("MultiPoint"), coordinates: z.array(coordinateSchema) }),
  z.object({ type: z.literal("LineString"), coordinates: z.array(coordinateSchema) }),
  z.object({
    type: z.literal("MultiLineString"),
    coordinates: z.array(z.array(coordinateSchema)),
  }),
  z.object({
    type: z.literal("Polygon"),
    coordinates: z.array(z.array(coordinateSchema)),
  }),
  z.object({
    type: z.literal("MultiPolygon"),
    coordinates: z.array(z.array(z.array(coordinateSchema))),
  }),
]);

const geoJsonFeatureSchema = z.object({
  type: z.literal("Feature"),
  id: z.union([z.string(), z.number()]).optional(),
  geometry: geometrySchema,
  properties: z.record(z.string(), z.unknown()).optional(),
});

const themeTokenSchema = z.enum(
  Object.keys(editorDefaultTheme.polygon) as [string, ...string[]],
);

const editorStyleSchema = z.object({
  themeToken: themeTokenSchema.optional(),
  strokeColor: z.string().optional(),
  strokeWidth: z.number().optional(),
  fillColor: z.string().optional(),
  opacity: z.number().optional(),
  labelColor: z.string().optional(),
});

const validationIssueSchema = z.object({
  code: z.enum(ValidationIssueCode),
  message: z.string().optional(),
  featureId: z.string().optional(),
  layerId: z.string().optional(),
});

const featureSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  geometryKind: z.enum(GeometryKind),
  feature: geoJsonFeatureSchema,
  state: z.object({
    selection: z.enum(SelectionState),
    lifecycle: z.enum(FeatureLifecycle),
    validation: z.enum(ValidationState),
    issues: z.array(validationIssueSchema),
  }),
  view: z.object({ visibility: z.enum(VisibilityState) }).optional(),
  behavior: z
    .object({
      editability: z.enum(EditabilityState).optional(),
      selectable: z.boolean().optional(),
      deletable: z.boolean().optional(),
      draggable: z.boolean().optional(),
      vertexEditable: z.boolean().optional(),
    })
    .optional(),
  style: editorStyleSchema.optional(),
});

// LayerRole에서 제거됐지만 과거 v1 payload 호환을 위해 입력은 허용하고 내부에서 버리는 역할입니다.
// (편집 가능 여부 같은 역량은 LayerRole이 아니라 EditabilityState로 표현되므로 역할 제거가 안전합니다.)
const REMOVED_LAYER_ROLES = ["readonly"] as const;

const layerRolesSchema = z
  .array(z.union([z.enum(LayerRole), z.enum(REMOVED_LAYER_ROLES)]))
  .transform((roles) =>
    roles.filter(
      (role): role is LayerRole =>
        !(REMOVED_LAYER_ROLES as readonly string[]).includes(role),
    ),
  );

const layerSchema = z.object({
  id: z.string(),
  name: z.string(),
  roles: layerRolesSchema,
  geometryKinds: z.array(z.enum(GeometryKind)),
  view: z.object({
    visibility: z.enum(VisibilityState),
    opacity: z.number(),
    zIndex: z.number(),
    labelVisible: z.boolean(),
  }),
  behavior: z.object({
    lock: z.enum(LockState),
    editability: z.enum(EditabilityState),
    selectable: z.boolean(),
    deletable: z.boolean(),
    draggable: z.boolean(),
  }),
  rules: z
    .object({
      preventSelfIntersection: z.boolean().optional(),
      preventOverlap: z.boolean().optional(),
      mustStayInsideLayerId: z.string().optional(),
      snapEnabled: z.boolean().optional(),
      snapTargetLayerIds: z.array(z.string()).optional(),
      minAreaSquareMeters: z.number().optional(),
      maxAreaSquareMeters: z.number().optional(),
      minLengthMeters: z.number().optional(),
      maxLengthMeters: z.number().optional(),
    })
    .optional(),
  style: editorStyleSchema.optional(),
  features: z.array(featureSchema),
});

export const editorSceneSchema = z.object({
  version: z.literal(1),
  id: z.string().optional(),
  name: z.string().optional(),
  layers: z.array(layerSchema),
  viewport: z
    .object({
      center: coordinateSchema.optional(),
      zoom: z.number().optional(),
      fitLayerIds: z.array(z.string()).optional(),
      fitFeatureIds: z.array(z.string()).optional(),
    })
    .optional(),
});

const initMessageSchema = z.object({
  type: z.literal(EditorMessageType.Init),
  sessionId: z.string(),
  scene: editorSceneSchema,
});

export type ParseInitMessageResult =
  | { ok: true; message: EditorInitMessage }
  | { ok: false; message: string; issues: EditorValidationIssue[] };

// 임의의 postMessage 데이터를 EditorInitMessage로 검증합니다.
export function parseInitMessage(data: unknown): ParseInitMessageResult {
  const result = initMessageSchema.safeParse(data);

  if (result.success) {
    return { ok: true, message: result.data as EditorInitMessage };
  }

  const issues: EditorValidationIssue[] = result.error.issues.map((issue) => ({
    code: ValidationIssueCode.InvalidPayload,
    message: `${issue.path.join(".") || "(root)"}: ${issue.message}`,
  }));

  return { ok: false, message: "초기화 메시지 검증에 실패했습니다.", issues };
}
