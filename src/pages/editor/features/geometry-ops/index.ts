export { GeometryOpMarkers } from "./components/GeometryOpMarkers";
export { normalizePolygonalGeometry } from "./model/normalizePolygonalGeometry";
export { createGeometryOverlapCache } from "./model/geometryOverlapCache";
export {
  bboxesOverlap,
  geometryBbox,
  hasAreaOverlap,
  intersectGeometries,
  subtractGeometry,
  unionGeometries,
} from "./model/booleanOps";
export {
  buildGeometryOpMarkerInputs,
  deriveGeometryOpTargets,
  findGeometryOpTarget,
  type GeometryOpTargets,
} from "./model/geometryOpsModel";
