import { z } from "zod";

const coordinateSchema = z.tuple([z.number(), z.number()]);
const lineStringCoordinatesSchema = z.array(coordinateSchema).min(2);
const polygonCoordinatesSchema = z.array(z.array(coordinateSchema).min(4)).min(1);

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
