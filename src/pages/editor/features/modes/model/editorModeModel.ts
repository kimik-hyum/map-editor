import {
  CircleDot,
  type LucideIcon,
  Map as MapIcon,
  MousePointer2,
  PenTool,
} from "lucide-react";
import { EditorMode } from "../../../types/editorTypes";

export type EditorModeOption = {
  id: EditorMode;
  label: string;
  description: string;
  icon: LucideIcon;
};

// 좌측 도구 rail에 표시할 카탈로그입니다. 식별자는 editorStore가 공유하는 EditorMode를 사용합니다.
export const editorModeOptions: EditorModeOption[] = [
  {
    id: EditorMode.Select,
    label: "선택",
    description: "도형 선택 · 정점 편집(더블클릭)",
    icon: MousePointer2,
  },
  {
    id: EditorMode.Draw,
    label: "그리기",
    description: "폴리곤 · 패스 새로 그리기",
    icon: PenTool,
  },
  {
    id: EditorMode.Boundary,
    label: "경계",
    description: "행정동 · 법정동 · 우편 경계 선택",
    icon: MapIcon,
  },
  {
    id: EditorMode.Radius,
    label: "반경",
    description: "마커 기준 반경 커팅",
    icon: CircleDot,
  },
];
