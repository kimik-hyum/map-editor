import { Cable, Database, KeyRound, PencilRuler, Rocket, Wrench } from "lucide-react";
import type { AppSideMenuGroup } from "@/shared/navigation/AppSideMenu";

export type DocsAudience = "integration" | "self-hosting";
type DocsMenuGroup = AppSideMenuGroup & { pageTitle?: string };

export const integrationMenuGroups: DocsMenuGroup[] = [
  {
    icon: Rocket,
    label: "서비스 소개",
    pageTitle: "도형을 보내고, 편집 결과를 돌려받으세요",
    to: "/",
    sections: [
      { href: "#contract", label: "두 화면의 역할" },
      { href: "#connect", label: "연결 순서" },
      { href: "#result", label: "편집 완료와 서버 저장" },
      { href: "#quickstart", label: "편집 흐름 체험" },
      { href: "#terms", label: "문서의 용어" },
      { href: "#next", label: "이어서 보기" },
    ],
  },
  {
    icon: Cable,
    label: "연동 인터페이스",
    pageTitle: "편집 창 연동하기",
    to: "/integration",
    sections: [
      { href: "#addresses", label: "편집기 주소와 연결 조건" },
      { href: "#messages", label: "메시지 순서" },
      { href: "#example", label: "사각형 하나로 시작" },
      { href: "#scene", label: "보내는 편집 데이터" },
      { href: "#roundtrip", label: "받은 편집 결과 반영" },
      { href: "#quickstart", label: "설치 없이 실습" },
      { href: "#validation", label: "직접 구현할 때" },
      { href: "#errors", label: "문제 해결" },
    ],
  },
  {
    icon: PencilRuler,
    label: "편집 도구 안내",
    to: "/editing",
    sections: [
      { href: "#screen", label: "화면 구성" },
      { href: "#tools", label: "도구별 동작" },
      { href: "#operations", label: "합치기·빼기·교집합" },
      { href: "#finish", label: "편집 완료·취소 조건" },
      { href: "#shortcuts", label: "단축키" },
    ],
  },
];

export const selfHostingMenuGroups: DocsMenuGroup[] = [
  {
    icon: Wrench,
    label: "직접 운영·커스텀",
    to: "/self-hosting",
    sections: [
      { href: "#shared", label: "공통 연동 방식" },
      { href: "#run", label: "로컬 실행" },
      { href: "#architecture", label: "수정할 위치" },
      { href: "#deployment", label: "내 환경에 배포" },
    ],
  },
  {
    icon: Database,
    label: "경계 데이터 어댑터",
    to: "/self-hosting/boundaries",
    sections: [
      { href: "#boundary", label: "교체할 경계" },
      { href: "#contract", label: "어댑터 인터페이스" },
      { href: "#json", label: "JSON 데이터 예제" },
      { href: "#connect", label: "조회 함수 연결" },
      { href: "#access", label: "인증 없이·자체 인증" },
      { href: "#verify", label: "교체 후 확인" },
    ],
  },
  {
    icon: KeyRound,
    label: "Google·Supabase (선택)",
    pageTitle: "Google·Supabase 구성 (선택)",
    to: "/authentication",
    sections: [
      { href: "#flow", label: "기본 배포의 로그인" },
      { href: "#configuration", label: "환경 변수·로그인 복귀 주소" },
      { href: "#security", label: "접근 제한" },
      { href: "#troubleshooting", label: "문제 해결" },
    ],
  },
];

export function getDocsAudience(pathname: string): DocsAudience {
  const path = pathname.replace(/\/$/, "") || "/";
  return path === "/authentication" ||
    path === "/self-hosting" ||
    path.startsWith("/self-hosting/")
    ? "self-hosting"
    : "integration";
}
