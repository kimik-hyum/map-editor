import { Building2, Layers, type LucideIcon, Mail } from "lucide-react";
import { BoundaryKind, boundaryKindLabels } from "@/pages/editor/types/editorTypes";

export type BoundaryKindOption = {
  id: BoundaryKind;
  label: string;
  description: string;
  icon: LucideIcon;
};

// 경계 도구 팝업에 표시할 경계 종류 카탈로그입니다.
// 라벨은 enums의 boundaryKindLabels를 단일 출처로 사용합니다.
export const boundaryKindOptions: BoundaryKindOption[] = [
  {
    id: BoundaryKind.AdminDong,
    label: boundaryKindLabels[BoundaryKind.AdminDong],
    description: "행정 구역 단위",
    icon: Building2,
  },
  {
    id: BoundaryKind.LegalDong,
    label: boundaryKindLabels[BoundaryKind.LegalDong],
    description: "법정 구역 단위",
    icon: Layers,
  },
  {
    id: BoundaryKind.PostalCode,
    label: boundaryKindLabels[BoundaryKind.PostalCode],
    description: "우편번호 권역",
    icon: Mail,
  },
];
