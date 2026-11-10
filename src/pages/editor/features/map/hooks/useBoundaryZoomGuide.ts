import { useBoundaryAccess } from "@/features/auth";
import { useT } from "@/shared/i18n/useT";
import { useEditorStore } from "@/pages/editor/state/editorStore";
import { useRegionKinds } from "../../regions/hooks/useRegionKinds";
import type { RegionBoundaryStatus } from "../../regions/hooks/useRegionBoundaries";
import type { useUsBoundaryPreview } from "../../us-boundaries/hooks/useUsBoundaryPreview";
import { usKindLabels } from "../../us-boundaries/model/usBoundaryModel";
import { getBoundaryZoomGuide } from "../model/boundaryZoomGuide";
import type { MapZoomState } from "@/pages/editor/adapters/openlayers/attachMapZoom";

export function useBoundaryZoomGuide(
  zoom: MapZoomState | null,
  active: boolean,
  regionStatus: RegionBoundaryStatus,
  usStatus: ReturnType<typeof useUsBoundaryPreview>,
) {
  const t = useT();
  const country = useEditorStore((state) => state.activeBoundaryCountry);
  const kind = useEditorStore((state) => state.activeBoundaryKind);
  const ready = useEditorStore((state) => state.scene !== null);
  const { allowed } = useBoundaryAccess();
  const catalog = useRegionKinds("KR", country === "KR");
  const guide = getBoundaryZoomGuide({
    country,
    kind,
    catalog: catalog.data,
    minZoom: Math.floor(zoom?.minZoom ?? 0),
    maxZoom: Math.floor(zoom?.maxZoom ?? 28),
  });
  const status = country === "US" ? usStatus : regionStatus;
  const actualLabel =
    country === "US"
      ? Object.entries(usKindLabels).find(([id]) => id === status.kind)?.[1]
      : (catalog.data?.find((entry) => entry.kind === status.kind)?.label ??
        guide.ranges.find((range) => range.kind === status.kind)?.label);
  let message: string;
  if (!active) message = t("경계 도구를 선택하면 미리보기가 표시됩니다.");
  else if (!ready) message = t("호스트(부모 창)에서 데이터를 기다리는 중…");
  else if (country === "KR" && !allowed)
    message = t("한국 경계는 로그인 후 표시됩니다.");
  else if (!kind) message = t("경계 종류를 선택하세요.");
  else if (status.error)
    message = t("경계를 불러오지 못했습니다. 도구 옵션을 확인하세요.");
  else if (status.loading) message = t("경계 불러오는 중…");
  else if (status.count > 0 && status.kind) {
    message = t("현재 표시: {{kind}} · {{count}}개", {
      kind: t(actualLabel ?? status.kind),
      count: status.count,
    });
  } else message = t("현재 화면에 표시할 경계가 없습니다.");
  return { ...guide, country, message };
}
