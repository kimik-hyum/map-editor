import { MapPinned } from "lucide-react";
import { useRegionKinds } from "@/pages/editor/features/regions";
import { usKindLabels } from "@/pages/editor/features/us-boundaries/model/usBoundaryModel";
import type { BoundaryCountryCode } from "@/shared/config/boundaryCountries";
import {
  createBoundaryKindOptions,
  fallbackBoundaryKindOptions,
} from "../model/boundaryKindModel";

const usOptions = Object.entries(usKindLabels).map(([id, label]) => ({
  id,
  label,
  description: id === "zcta" ? "우편번호 통계구역 · ZCTA" : "미국 Census 경계",
  icon: MapPinned,
}));
export function useBoundaryKindOptions(country: BoundaryCountryCode) {
  const query = useRegionKinds("KR", country === "KR");
  return {
    ...query,
    options:
      country === "US"
        ? usOptions
        : query.data
          ? createBoundaryKindOptions(query.data)
          : fallbackBoundaryKindOptions,
  };
}
