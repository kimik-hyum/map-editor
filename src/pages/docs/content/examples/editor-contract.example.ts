import { z } from "zod";

// 외부 서비스로 복사할 수 있는 최소 검증 예제입니다. 업무별 저장 권한·면적 검증은 별도입니다.
const coordinateSchema = z.tuple([
  z.number().min(-180).max(180),
  z.number().min(-90).max(90),
]);
const lineStringCoordinatesSchema = z.array(coordinateSchema).min(2);
const ringSchema = z
  .array(coordinateSchema)
  .min(3)
  .superRefine((ring, context) => {
    const first = ring[0];
    const last = ring[ring.length - 1];
    const closed = first && last && first[0] === last[0] && first[1] === last[1];
    const vertices = closed ? ring.slice(0, -1) : ring;
    if (
      (closed && ring.length < 4) ||
      new Set(vertices.map((point) => point.join(","))).size < 3
    ) {
      context.addIssue({
        code: "custom",
        message: "Polygon에는 서로 다른 정점이 3개 이상 필요합니다.",
      });
    }
  });
const polygonCoordinatesSchema = z.array(ringSchema).min(1);

const geometrySchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("Point"),
    coordinates: coordinateSchema,
  }),
  z.object({
    type: z.literal("MultiPoint"),
    coordinates: z.array(coordinateSchema).min(1),
  }),
  z.object({
    type: z.literal("LineString"),
    coordinates: lineStringCoordinatesSchema,
  }),
  z.object({
    type: z.literal("MultiLineString"),
    coordinates: z.array(lineStringCoordinatesSchema).min(1),
  }),
  z.object({
    type: z.literal("Polygon"),
    coordinates: polygonCoordinatesSchema,
  }),
  z.object({
    type: z.literal("MultiPolygon"),
    coordinates: z.array(polygonCoordinatesSchema).min(1),
  }),
]);

const featureInputSchema = z.object({
  geometry: geometrySchema,
  id: z.string().optional(),
  name: z.string().optional(),
  locked: z.boolean().optional(),
  visible: z.boolean().optional(),
  themeToken: z.string().optional(),
  properties: z.record(z.string(), z.unknown()).optional(),
});

export const editorSceneInputSchema = z.object({
  version: z.literal(2),
  features: z.array(featureInputSchema),
  id: z.string().optional(),
  name: z.string().optional(),
  viewport: z
    .object({
      center: coordinateSchema.optional(),
      zoom: z.number().optional(),
    })
    .optional(),
});

export const completionMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("MAP_EDITOR_SUBMIT"),
    sessionId: z.string().min(1),
    scene: editorSceneInputSchema,
  }),
  z.object({
    type: z.literal("MAP_EDITOR_CANCEL"),
    sessionId: z.string().min(1),
  }),
]);

export type EditorSceneInput = z.infer<typeof editorSceneInputSchema>;
