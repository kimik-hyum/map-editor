import { readBoundaryCountry } from "../src/shared/config/boundaryCountries";

type CountryContext = {
  request: Request & { cf?: { country?: string | null } };
  next: () => Promise<Response>;
};

// 첫 HTML을 받기 전에 국가를 URL로 확정합니다. 비동기 조회가 사용자의 메뉴 선택이나
// 새 INIT을 덮어쓰지 않고, popup의 origin·나머지 URL 인자도 그대로 유지됩니다.
export function onRequest({ request, next }: CountryContext) {
  const url = new URL(request.url);
  if (
    !["GET", "HEAD"].includes(request.method) ||
    !/^\/(demo|editor)(\/|\/index\.html)?$/.test(url.pathname) ||
    readBoundaryCountry(url.search)
  ) {
    return next();
  }

  // 국적이 아닌 접속 IP 국가입니다. 브라우저가 보낸 국가/IP 헤더는 사용하지 않습니다.
  // 국가 불명 접속은 한국 경계 API의 KR 전용 접근 정책에 맞춰 공개 미국 경계로 시작합니다.
  url.searchParams.set("country", request.cf?.country === "KR" ? "KR" : "US");
  return new Response(null, {
    status: 302,
    headers: {
      Location: url.href,
      "Cache-Control": "private, no-store",
      "Cloudflare-CDN-Cache-Control": "no-store",
    },
  });
}
