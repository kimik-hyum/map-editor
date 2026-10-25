import { createI18n } from "./i18n";
import { getLocale, stripLocale } from "./locale";

const titles: Record<string, string> = {
  "/": "도형을 보내고, 편집 결과를 돌려받으세요",
  "/integration": "편집 창 연동하기",
  "/editing": "편집 도구 안내",
  "/authentication": "Google·Supabase 구성 (선택)",
  "/self-hosting": "직접 운영·커스텀",
  "/self-hosting/boundaries": "경계 데이터 어댑터",
  "/about": "Termia 소개 · 경계를 그리고, 공간에 가치를 더하다",
  "/demo": "새 탭 연동 데모",
  "/editor": "편집 도구",
};
export function getPageMetadata(path: string) {
  const locale = getLocale(path);
  const translator = createI18n(locale);
  const title = translator.t(
    titles[stripLocale(path).replace(/\/$/, "") || "/"] ?? "Termia",
  );
  return {
    locale,
    title:
      stripLocale(path).replace(/\/$/, "") === "/about" ? title : `${title} | Termia`,
    description: translator.t(
      "서비스 페이지에서 편집 창을 열고 도형 데이터를 보내세요. 사용자가 편집을 완료하면 결과가 원래 서비스 페이지로 전달됩니다. 받은 결과를 화면에 반영하거나 서버에 저장할 수 있습니다.",
    ),
  };
}
