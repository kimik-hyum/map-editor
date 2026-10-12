import type OpenLayersMap from "ol/Map";
import { Globe2 } from "lucide-react";
import { useUsBoundaryPreview } from "../hooks/useUsBoundaryPreview";
import { UsBoundaryPanel } from "./UsBoundaryPanel";

export function UsBoundaryPreview({
  map,
  blocked,
}: {
  map: OpenLayersMap | null;
  blocked: boolean;
}) {
  const preview = useUsBoundaryPreview(map);
  return (
    <>
      <button
        type="button"
        aria-pressed={preview.open}
        disabled={blocked || !map}
        onClick={preview.open ? preview.close : preview.show}
        className="absolute bottom-12 right-4 z-[6] flex items-center gap-2 rounded-lg border border-teal-300 bg-white/95 px-3 py-2 text-xs font-extrabold text-teal-800 shadow-sm hover:bg-teal-50 disabled:opacity-50"
      >
        <Globe2 aria-hidden className="h-4 w-4" />
        미국 경계 보기
      </button>
      {preview.open ? <UsBoundaryPanel preview={preview} blocked={blocked} /> : null}
    </>
  );
}
