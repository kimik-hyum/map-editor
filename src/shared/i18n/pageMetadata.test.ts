import { describe, expect, it } from "vitest";
import { getPageMetadata } from "./pageMetadata";

const attributes = (path: string, key: string, value: string) =>
  getPageMetadata(path)
    .elements.filter((element) => element.attributes[key] === value)
    .map((element) => element.attributes);

describe("언어별 페이지 메타데이터", () => {
  it("국가·쿼리·해시와 독립적으로 제목과 공유 이미지를 선택한다", () => {
    const path = "/en/integration?country=KR#example";
    expect(getPageMetadata(path).title).toBe("Integrate the editor window | Termia");
    expect(getPageMetadata(path).description).toContain("postMessage");
    expect(attributes(path, "property", "og:locale")[0].content).toBe("en_US");
    expect(attributes(path, "property", "og:locale:alternate")[0].content).toBe(
      "ko_KR",
    );
    expect(attributes(path, "property", "og:image")[0].content).toBe(
      "https://maps-editor.pages.dev/brand/social-en.png",
    );
    expect(attributes(path, "property", "og:url")[0].content).toBe(
      "https://maps-editor.pages.dev/en/integration/",
    );
    expect(attributes(path, "hreflang", "x-default")[0].href).toBe(
      "https://maps-editor.pages.dev/ko/integration/",
    );
  });

  it.each([
    "/",
    "/integration",
    "/editing",
    "/authentication",
    "/self-hosting",
    "/self-hosting/boundaries",
    "/about",
    "/demo",
    "/editor",
    "/auth/callback",
  ])("%s의 두 언어가 제목·설명·공유 태그를 갖는다", (route) => {
    for (const locale of ["ko", "en"]) {
      const path = `/${locale}${route}`;
      const meta = getPageMetadata(path);
      expect(meta.locale).toBe(locale);
      expect(meta.title).not.toBe("Termia | Termia");
      expect(meta.description).toBeTruthy();
      expect(/[가-힣]/.test(meta.title + meta.description)).toBe(locale === "ko");
      expect(attributes(path, "property", "og:title")[0].content).toBe(meta.title);
      expect(attributes(path, "name", "twitter:description")[0].content).toBe(
        meta.description,
      );
      expect(attributes(path, "hreflang", "ko")).toHaveLength(1);
      expect(attributes(path, "hreflang", "en")).toHaveLength(1);
    }
  });

  it("페이지마다 설명을 구분하고 리디렉션은 실제 문서 URL을 가리킨다", () => {
    expect(getPageMetadata("/en/editor").description).not.toBe(
      getPageMetadata("/en/").description,
    );
    expect(attributes("/en/screen", "rel", "canonical")[0].href).toBe(
      "https://maps-editor.pages.dev/en/editing/",
    );
    expect(attributes("/ko/auth/callback", "name", "robots")[0].content).toBe(
      "noindex, nofollow",
    );
    expect(attributes("/ko/", "name", "robots")[0].content).toBe("index, follow");
  });
});
