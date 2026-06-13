export { GeometryOpMarkers } from "./components/GeometryOpMarkers";
export {
  hasAreaOverlap,
  MIN_OVERLAP_AREA_SQUARE_METERS,
  overlapAreaSquareMeters,
  subtractGeometry,
  unionGeometries,
} from "./model/booleanOps";
export {
  buildGeometryOpMarkerInputs,
  deriveGeometryOpTargets,
  type GeometryOpMarkerInput,
  type GeometryOpTargets,
} from "./model/geometryOpsModel";
