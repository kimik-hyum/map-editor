import { EditorMode } from "../../../types/editorTypes";

export type EditorModeOption = {
  id: EditorMode;
  title: string;
  label: string;
  tags: string[];
};

// 모드 패널에 표시할 카탈로그입니다. 식별자는 editorStore가 공유하는 EditorMode를 사용합니다.
export const editorModeOptions: EditorModeOption[] = [
  {
    id: EditorMode.ManualEdit,
    title: "수동 편집",
    label: "직접",
    tags: ["폴리곤", "패스"],
  },
  {
    id: EditorMode.AdministrativeDong,
    title: "행정동 선택",
    label: "행정동",
    tags: ["경계", "선택"],
  },
  {
    id: EditorMode.LegalDong,
    title: "법정동 선택",
    label: "법정동",
    tags: ["경계", "선택"],
  },
  {
    id: EditorMode.RadiusCut,
    title: "반경 자르기",
    label: "반경",
    tags: ["거리", "클립"],
  },
  {
    id: EditorMode.MergeCut,
    title: "병합/제외",
    label: "연산",
    tags: ["병합", "제외"],
  },
  {
    id: EditorMode.SnapAlign,
    title: "스냅/정렬",
    label: "보정",
    tags: ["스냅", "정렬"],
  },
  {
    id: EditorMode.Inspect,
    title: "검증",
    label: "검증",
    tags: ["오류", "면적"],
  },
];
