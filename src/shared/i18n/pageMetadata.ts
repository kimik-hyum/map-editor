import { createI18n } from "./i18n";
import {
  defaultLocale,
  getLocale,
  localizePath,
  stripLocale,
  supportedLocales,
} from "./locale";

const siteOrigin = "https://maps-editor.pages.dev";
const pages: Record<string, { title: string; description: string }> = {
  "/": {
    title: "도형을 보내고, 편집 결과를 돌려받으세요",
    description:
      "Termia에서 지도 위의 점·선·다각형을 편집하고, GeoJSON 결과를 서비스에 연결하세요.",
  },
  "/integration": {
    title: "편집 창 연동하기",
    description:
      "Termia 편집 창을 열고 postMessage로 도형을 보내고 받는 방법을 코드 예제와 함께 확인하세요.",
  },
  "/editing": {
    title: "편집 도구 안내",
    description:
      "점·선·다각형 그리기부터 경계 데이터, 도형 합치기·빼기, 레이어 관리까지 Termia의 편집 도구를 알아보세요.",
  },
  "/authentication": {
    title: "Google·Supabase 구성 (선택)",
    description:
      "직접 운영하는 Termia에 Google 로그인과 Supabase를 연결하고 경계 데이터 접근 정책을 설정하세요.",
  },
  "/self-hosting": {
    title: "직접 운영·커스텀",
    description:
      "Termia를 직접 실행·빌드·배포하고 서비스에 맞게 편집기와 데이터 공급자를 설정하는 방법을 알아보세요.",
  },
  "/self-hosting/boundaries": {
    title: "경계 데이터 어댑터",
    description:
      "자체 JSON이나 API를 Termia의 경계 데이터 어댑터에 연결해 서비스에 필요한 참고 경계를 제공하세요.",
  },
  "/about": {
    title: "Termia 소개 · 경계를 그리고, 공간에 가치를 더하다",
    description:
      "경계를 그리고 공간에 가치를 더하는 Termia. 지도 위의 도형 편집과 서비스 연동을 위한 도구를 소개합니다.",
  },
  "/demo": {
    title: "새 탭 연동 데모",
    description:
      "예제 도형을 새 편집 창으로 보내고 수정된 GeoJSON 결과를 돌려받으며 Termia 연동을 체험하세요.",
  },
  "/editor": {
    title: "편집 도구",
    description:
      "Termia 편집기에서 지도 도형을 그리고 수정하세요. 참고 경계와 레이어를 활용하고 편집 결과를 서비스로 전달할 수 있습니다.",
  },
  "/auth/callback": {
    title: "로그인 완료",
    description: "Termia 로그인 결과를 확인하고 원래 편집 화면으로 돌아갑니다.",
  },
};

export type MetadataElement = {
  tag: "meta" | "link";
  attributes: Record<string, string>;
};

export function getPageMetadata(path: string) {
  const pathname = path.split(/[?#]/)[0];
  const locale = getLocale(pathname);
  const route = stripLocale(pathname).replace(/\/+$/, "") || "/";
  const page = pages[route === "/screen" ? "/editing" : route] ?? pages["/"];
  const translator = createI18n(locale);
  const translatedTitle = translator.t(page.title);
  const title = route === "/about" ? translatedTitle : `${translatedTitle} | Termia`;
  const description = translator.t(page.description);
  const canonicalPath = route === "/screen" ? "/editing" : route;
  const localizedUrl = (language: typeof locale) =>
    `${siteOrigin}${localizePath(canonicalPath, language).replace(/\/?$/, "/")}`;
  const canonical = localizedUrl(locale);
  const image = `${siteOrigin}/brand/social-${locale}.png`;
  const imageAlt = translator.t("Termia · 지도 도형 편집을 내 서비스에 연결하세요");
  const ogLocales = { ko: "ko_KR", en: "en_US" };
  const elements: MetadataElement[] = [
    { tag: "meta", attributes: { name: "description", content: description } },
    {
      tag: "meta",
      attributes: {
        name: "robots",
        content: route === "/auth/callback" ? "noindex, nofollow" : "index, follow",
      },
    },
    ...Object.entries({
      "og:type": "website",
      "og:site_name": "Termia",
      "og:title": title,
      "og:description": description,
      "og:url": canonical,
      "og:locale": ogLocales[locale],
      "og:image": image,
      "og:image:type": "image/png",
      "og:image:width": "1200",
      "og:image:height": "630",
      "og:image:alt": imageAlt,
    }).map(
      ([property, content]): MetadataElement => ({
        tag: "meta",
        attributes: { property, content },
      }),
    ),
    ...supportedLocales
      .filter((language) => language !== locale)
      .map(
        (language): MetadataElement => ({
          tag: "meta",
          attributes: { property: "og:locale:alternate", content: ogLocales[language] },
        }),
      ),
    ...Object.entries({
      "twitter:card": "summary_large_image",
      "twitter:title": title,
      "twitter:description": description,
      "twitter:image": image,
      "twitter:image:alt": imageAlt,
    }).map(
      ([name, content]): MetadataElement => ({
        tag: "meta",
        attributes: { name, content },
      }),
    ),
    { tag: "link", attributes: { rel: "canonical", href: canonical } },
    ...[...supportedLocales, "x-default" as const].map(
      (language): MetadataElement => ({
        tag: "link",
        attributes: {
          rel: "alternate",
          hreflang: language,
          href: localizedUrl(language === "x-default" ? defaultLocale : language),
        },
      }),
    ),
  ];
  return { locale, title, description, elements };
}
