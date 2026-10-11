import { z } from "zod";

export const REGION_SEARCH_MIN_LENGTH = 2;
export const REGION_SEARCH_MAX_LENGTH = 100;
export const REGION_SEARCH_LIMIT = 20;

export const normalizeRegionSearch = (value: string) =>
  value.normalize("NFC").trim().replace(/\s+/g, " ");

const longitude = z.number().finite().min(-180).max(180);
const latitude = z.number().finite().min(-85).max(85);
export const regionSearchItemSchema = z.object({
  id: z.string().min(1),
  kind: z.string().min(1),
  code: z.string(),
  name: z.string().min(1),
  context: z.string(),
  center: z.tuple([longitude, latitude]),
  bbox: z
    .tuple([longitude, latitude, longitude, latitude])
    .refine(([west, south, east, north]) => west <= east && south <= north),
  minZoom: z.number().finite().min(0).max(20),
});
export const regionSearchResponseSchema = z.object({
  country: z.string().length(2),
  kind: z.string().min(1),
  items: z.array(regionSearchItemSchema).max(REGION_SEARCH_LIMIT),
  hasMore: z.boolean(),
});
export type RegionSearchItem = z.infer<typeof regionSearchItemSchema>;
export type RegionSearchResponse = z.infer<typeof regionSearchResponseSchema>;
