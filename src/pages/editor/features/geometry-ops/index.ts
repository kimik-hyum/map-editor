export { GeometryOpMarkers } from "./components/GeometryOpMarkers";
export { normalizePolygonalGeometry } from "./model/normalizePolygonalGeometry";
export {
  hasAreaOverlap,
  intersectGeometries,
  subtractGeometry,
  unionGeometries,
} from "./model/booleanOps";
export {
  buildGeometryOpMarkerInputs,
  deriveGeometryOpTargets,
  type GeometryOpTargets,
} from "./model/geometryOpsModel";
