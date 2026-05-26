import { useEffect, useRef } from "react";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import { fromLonLat } from "ol/proj";
import OSM from "ol/source/OSM";
import "ol/ol.css";

export function EditorPage() {
  const mapElementRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!mapElementRef.current) {
      return;
    }

    const map = new Map({
      layers: [
        new TileLayer({
          source: new OSM(),
        }),
      ],
      target: mapElementRef.current,
      view: new View({
        center: fromLonLat([126.978, 37.5665]),
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
