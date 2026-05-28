import { useEffect, useRef } from "react";
import Feature from "ol/Feature";
import Map from "ol/Map";
import View from "ol/View";
import MultiPolygon from "ol/geom/MultiPolygon";
import Polygon from "ol/geom/Polygon";
import VectorLayer from "ol/layer/Vector";
import TileLayer from "ol/layer/Tile";
import { fromLonLat } from "ol/proj";
import OSM from "ol/source/OSM";
import VectorSource from "ol/source/Vector";
import { Fill, Stroke, Style, Text } from "ol/style";
import "ol/ol.css";
import { sampleEditorDocument } from "./fixtures/sampleEditorDocument";
import {
  editorDefaultTheme,
  type EditorPolygonThemeToken,
} from "./theme/editorTheme";
import {
  LayerRole,
  SelectionState,
  ValidationState,
  VisibilityState,
  type EditorCoordinate,
  type EditorDocument,
  type EditorFeature,
  type EditorLayer,
  type GeoJsonGeometry,
} from "./types/editorTypes";

const layerRoleThemeTokens: Array<[LayerRole, EditorPolygonThemeToken]> = [
  [LayerRole.Background, "background"],
  [LayerRole.Mask, "mask"],
  [LayerRole.SnapTarget, "snapTarget"],
  [LayerRole.Reference, "reference"],
  [LayerRole.Readonly, "readonly"],
  [LayerRole.Editable, "editable"],
];

function projectRing(ring: EditorCoordinate[]) {
  return ring.map((coordinate) => fromLonLat(coordinate));
}

function createOpenLayersGeometry(geometry: GeoJsonGeometry) {
  if (geometry.type === "Polygon") {
    return new Polygon(geometry.coordinates.map(projectRing));
  }

  if (geometry.type === "MultiPolygon") {
    return new MultiPolygon(
      geometry.coordinates.map((polygon) => polygon.map(projectRing)),
    );
  }

  return null;
}

function resolvePolygonThemeToken(
  feature: EditorFeature,
  layer: EditorLayer,
): EditorPolygonThemeToken {
  if (feature.style?.themeToken) {
    return feature.style.themeToken;
  }

  if (layer.style?.themeToken) {
    return layer.style.themeToken;
  }

  if (feature.state.validation === ValidationState.Invalid) {
    return "invalid";
  }

  if (feature.state.validation === ValidationState.Warning) {
    return "warning";
  }

  if (feature.state.selection === SelectionState.Active) {
    return "active";
  }

  if (feature.state.selection === SelectionState.Selected) {
    return "selected";
  }

  return (
    layerRoleThemeTokens.find(([role]) => layer.roles.includes(role))?.[1] ??
    "editable"
  );
}

function createFeatureStyle(feature: EditorFeature, layer: EditorLayer) {
  const token = resolvePolygonThemeToken(feature, layer);
  const polygonStyle = {
    ...editorDefaultTheme.polygon[token],
    ...layer.style,
    ...feature.style,
  };
  const labelStyle = editorDefaultTheme.label;

  return new Style({
    fill: new Fill({
      color: polygonStyle.fillColor,
    }),
    stroke: new Stroke({
      color: polygonStyle.strokeColor,
      width: polygonStyle.strokeWidth,
    }),
    text: layer.view.labelVisible
      ? new Text({
          backgroundFill: new Fill({
            color: labelStyle.backgroundColor,
          }),
          backgroundStroke: new Stroke({
            color: labelStyle.borderColor,
            width: 1,
          }),
          fill: new Fill({
            color: labelStyle.color,
          }),
          font: "700 11px Inter, system-ui, sans-serif",
          overflow: true,
          padding: [2, 4, 2, 4],
          stroke: new Stroke({
            color: labelStyle.haloColor,
            width: 4,
          }),
          text: feature.name ?? String(feature.feature.id ?? ""),
        })
      : undefined,
  });
}

function createOpenLayersFeature(feature: EditorFeature, layer: EditorLayer) {
  const geometry = createOpenLayersGeometry(feature.feature.geometry);

  if (!geometry) {
    return null;
  }

  const openLayersFeature = new Feature({
    geometry,
    name: feature.name,
  });

  openLayersFeature.setId(feature.id);
  openLayersFeature.setStyle(createFeatureStyle(feature, layer));

  return openLayersFeature;
}

function createDocumentVectorLayer(layer: EditorLayer) {
  const features = layer.features.flatMap((feature) => {
    const openLayersFeature = createOpenLayersFeature(feature, layer);

    return openLayersFeature ? [openLayersFeature] : [];
  });
  const opacity =
    layer.view.visibility === VisibilityState.Dimmed
      ? layer.view.opacity * 0.5
      : layer.view.opacity;

  return new VectorLayer({
    opacity,
    source: new VectorSource({
      features,
    }),
    visible: layer.view.visibility !== VisibilityState.Hidden,
    zIndex: layer.view.zIndex,
  });
}

function createDocumentLayers(editorDocument: EditorDocument) {
  return editorDocument.layers.map(createDocumentVectorLayer);
}

function getDocumentCenter(editorDocument: EditorDocument) {
  return fromLonLat(editorDocument.viewport?.center ?? [126.98, 37.57]);
}

function getDocumentZoom(editorDocument: EditorDocument) {
  return editorDocument.viewport?.zoom ?? 12;
}

export function EditorPage() {
  const mapElementRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!mapElementRef.current) {
      return;
    }

    const editorDocument = sampleEditorDocument;
    const map = new Map({
      layers: [
        new TileLayer({
          source: new OSM(),
        }),
        ...createDocumentLayers(editorDocument),
      ],
      target: mapElementRef.current,
      view: new View({
        center: getDocumentCenter(editorDocument),
        zoom: getDocumentZoom(editorDocument),
      }),
    });

    return () => {
      map.setTarget(undefined);
    };
  }, []);

  return (
    <main className="editor-map-shell">
      <div ref={mapElementRef} className="editor-map" aria-label="OSM map editor" />
    </main>
  );
}
