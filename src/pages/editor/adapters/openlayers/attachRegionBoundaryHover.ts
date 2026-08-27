import type { Coordinate } from "ol/coordinate";
import GeoJSON from "ol/format/GeoJSON";
import MultiPolygon from "ol/geom/MultiPolygon";
import Polygon from "ol/geom/Polygon";
import type OpenLayersMap from "ol/Map";
import { unByKey } from "ol/Observable";
import Overlay from "ol/Overlay";
import type { PolygonalGeometry } from "@/pages/editor/types/editorTypes";
import type { RegionBoundaryLayer } from "./createRegionBoundaryLayer";

export type RegionBoundaryHover = {
  featureId: string;
  boundaryId: string | number;
  element: HTMLElement;
  name: string;
  displayGeometry: PolygonalGeometry;
};

type RegionBoundaryHoverOptions = {
  onHover: (hover: RegionBoundaryHover) => void;
  onClear: () => void;
};

const geojson = new GeoJSON();

function interiorCoordinateOf(geometry: Polygon | MultiPolygon): Coordinate | null {
  if (geometry instanceof Polygon) {
    return geometry.getInteriorPoint().getCoordinates().slice(0, 2);
  }

  const points = geometry.getInteriorPoints().getCoordinates();
  const widest = points.reduce<number[] | null>(
    (best, point) => (best === null || (point[2] ?? 0) > (best[2] ?? 0) ? point : best),
    null,
  );
  return widest ? widest.slice(0, 2) : null;
}

function displayGeometryOf(geometry: Polygon | MultiPolygon): PolygonalGeometry | null {
  const value = geojson.writeGeometryObject(geometry, {
    featureProjection: "EPSG:3857",
    dataProjection: "EPSG:4326",
  });

  return value.type === "Polygon" || value.type === "MultiPolygon"
    ? (value as PolygonalGeometry)
    : null;
}

// 외부 경계 위 포인터를 rAF로 흡수해, React에는 실제로 바뀐 경계만 전달합니다.
export function attachRegionBoundaryHover(
  map: OpenLayersMap,
  layer: RegionBoundaryLayer,
  options: RegionBoundaryHoverOptions,
) {
  const element = document.createElement("div");
  const overlay = new Overlay({
    element,
    positioning: "center-center",
    stopEvent: true,
  });
  map.addOverlay(overlay);

  let pendingCoordinate: Coordinate | null = null;
  let frame: number | null = null;
  let previousFeatureId: string | null = null;

  const clear = () => {
    const hadFeature = previousFeatureId !== null;
    pendingCoordinate = null;
    if (frame !== null) {
      cancelAnimationFrame(frame);
      frame = null;
    }
    previousFeatureId = null;
    overlay.setPosition(undefined);
    if (hadFeature) {
      options.onClear();
    }
  };

  const flush = () => {
    frame = null;
    const coordinate = pendingCoordinate;
    pendingCoordinate = null;
    if (!coordinate) {
      return;
    }

    const feature = layer.getSource()?.getFeaturesAtCoordinate(coordinate)[0];
    const featureId = feature?.getId();
    const geometry = feature?.getGeometry();
    if (
      !feature ||
      (typeof featureId !== "string" && typeof featureId !== "number") ||
      !(geometry instanceof Polygon || geometry instanceof MultiPolygon)
    ) {
      clear();
      return;
    }

    const id = String(featureId);
    if (id === previousFeatureId) {
      return;
    }

    const position = interiorCoordinateOf(geometry);
    const displayGeometry = displayGeometryOf(geometry);
    if (!position || !displayGeometry) {
      clear();
      return;
    }

    previousFeatureId = id;
    overlay.setPosition(position);
    options.onHover({
      featureId: id,
      boundaryId: featureId,
      element,
      name: typeof feature.get("name") === "string" ? feature.get("name") : id,
      displayGeometry,
    });
  };

  const moveKey = map.on("pointermove", (event) => {
    if (event.dragging) {
      return;
    }
    pendingCoordinate = event.coordinate;
    if (frame === null) {
      frame = requestAnimationFrame(flush);
    }
  });
  const moveStartKey = map.on("movestart", clear);

  const detach = () => {
    unByKey(moveKey);
    unByKey(moveStartKey);
    if (frame !== null) {
      cancelAnimationFrame(frame);
    }
    previousFeatureId = null;
    map.removeOverlay(overlay);
  };

  return { detach };
}
