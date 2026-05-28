import { useEffect, useRef } from "react";
import Feature from "ol/Feature";
import Map from "ol/Map";
import View from "ol/View";
import Polygon from "ol/geom/Polygon";
import VectorLayer from "ol/layer/Vector";
import TileLayer from "ol/layer/Tile";
import { fromLonLat } from "ol/proj";
import OSM from "ol/source/OSM";
import VectorSource from "ol/source/Vector";
import { Fill, Stroke, Style, Text } from "ol/style";
import "ol/ol.css";
import {
  editorDefaultTheme,
  type EditorPolygonThemeToken,
} from "./theme/editorTheme";

type SamplePolygonStyle = {
  label: string;
  center: [longitude: number, latitude: number];
  themeToken: EditorPolygonThemeToken;
};

const samplePolygonStyles: SamplePolygonStyle[] = [
  {
    label: "editable",
    center: [126.93, 37.585],
    themeToken: "editable",
  },
  {
    label: "active",
    center: [126.955, 37.585],
    themeToken: "active",
  },
  {
    label: "selected",
    center: [126.98, 37.585],
    themeToken: "selected",
  },
  {
    label: "readonly",
    center: [127.005, 37.585],
    themeToken: "readonly",
  },
  {
    label: "reference",
    center: [127.03, 37.585],
    themeToken: "reference",
  },
  {
    label: "background",
    center: [126.93, 37.555],
    themeToken: "background",
  },
  {
    label: "mask",
    center: [126.955, 37.555],
    themeToken: "mask",
  },
  {
    label: "snap",
    center: [126.98, 37.555],
    themeToken: "snapTarget",
  },
  {
    label: "warning",
    center: [127.005, 37.555],
    themeToken: "warning",
  },
  {
    label: "invalid",
    center: [127.03, 37.555],
    themeToken: "invalid",
  },
];

function createSamplePolygonRing([longitude, latitude]: SamplePolygonStyle["center"]) {
  const width = 0.007;
  const height = 0.005;
  const coordinates = [
    [longitude - width, latitude + height],
    [longitude + width * 0.85, latitude + height * 0.75],
    [longitude + width, latitude - height * 0.2],
    [longitude + width * 0.1, latitude - height],
    [longitude - width, latitude - height * 0.45],
    [longitude - width, latitude + height],
  ];

  return coordinates.map((coordinate) => fromLonLat(coordinate));
}

function createSamplePolygonFeature(sample: SamplePolygonStyle) {
  const polygonStyle = editorDefaultTheme.polygon[sample.themeToken];
  const labelStyle = editorDefaultTheme.label;
  const feature = new Feature({
    geometry: new Polygon([createSamplePolygonRing(sample.center)]),
    name: sample.label,
  });

  feature.setStyle(
    new Style({
      fill: new Fill({
        color: polygonStyle.fillColor,
      }),
      stroke: new Stroke({
        color: polygonStyle.strokeColor,
        width: polygonStyle.strokeWidth,
      }),
      text: new Text({
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
        text: sample.label,
      }),
    }),
  );

  return feature;
}

export function EditorPage() {
  const mapElementRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!mapElementRef.current) {
      return;
    }

    const samplePolygonLayer = new VectorLayer({
      source: new VectorSource({
        features: samplePolygonStyles.map(createSamplePolygonFeature),
      }),
      zIndex: 10,
    });

    const map = new Map({
      layers: [
        new TileLayer({
          source: new OSM(),
        }),
        samplePolygonLayer,
      ],
      target: mapElementRef.current,
      view: new View({
        center: fromLonLat([126.98, 37.57]),
        zoom: 12,
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
