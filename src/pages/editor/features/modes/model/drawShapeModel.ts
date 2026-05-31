import { Hexagon, type LucideIcon, MapPin, Spline } from "lucide-react";
import { type DrawShape, GeometryKind } from "@/pages/editor/types/editorTypes";

export type DrawShapeOption = {
  id: DrawShape;
  label: string;
  description: string;
  icon: LucideIcon;
};

// 그리기(추가) 도구 팝업에 표시할 도형 카탈로그입니다.
// "그리기 = 새 피처 추가" 개념이라 폴리곤/패스/마커를 한 자리에서 고릅니다.
export const drawShapeOptions: DrawShapeOption[] = [
  {
    id: GeometryKind.Polygon,
    label: "폴리곤",
    description: "닫힌 면 영역",
    icon: Hexagon,
  },
  {
    id: GeometryKind.Path,
    label: "패스",
    description: "열린 선 경로",
    icon: Spline,
  },
  {
    id: GeometryKind.Point,
    label: "마커",
    description: "기준점 한 개",
    icon: MapPin,
  },
];
