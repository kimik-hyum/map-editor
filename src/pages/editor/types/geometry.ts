export type EditorCoordinate = [longitude: number, latitude: number];

export type GeoJsonGeometry =
  | {
      type: "Point";
      coordinates: EditorCoordinate;
    }
  | {
      type: "MultiPoint" | "LineString";
      coordinates: EditorCoordinate[];
    }
  | {
      type: "MultiLineString" | "Polygon";
      coordinates: EditorCoordinate[][];
    }
  | {
      type: "MultiPolygon";
      coordinates: EditorCoordinate[][][];
    };

export type GeoJsonProperties = Record<string, unknown>;

export type GeoJsonFeature = {
  type: "Feature";
  id?: string | number;
  geometry: GeoJsonGeometry;
  properties?: GeoJsonProperties;
};
