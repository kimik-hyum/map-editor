import { describe, expect, it } from "vitest";
import { createI18n } from "./i18n";
import { getLocale, localizePath, stripLocale } from "./locale";
import koUi from "./locales/ko/ui.json";
import enUi from "./locales/en/ui.json";
import koDocs from "./locales/ko/docs.json";
import enDocs from "./locales/en/docs.json";
import koExamples from "./locales/ko/examples.json";
import enExamples from "./locales/en/examples.json";
import { localizeExample } from "./localizeExample";

describe("언어 경로와 번역", () => {
  it("언어를 국가 쿼리 및 앵커와 독립적으로 변경한다", () => {
    expect(localizePath("/ko/demo?country=KR#map", "en")).toBe(
      "/en/demo?country=KR#map",
    );
    expect(localizePath("/", "ko")).toBe("/ko/");
    expect(localizePath("#map", "en")).toBe("#map");
    expect(localizePath("https://example.com/editor", "en")).toBe(
      "https://example.com/editor",
    );
    expect(localizePath("//example.com", "en")).toBe("//example.com");
    expect(stripLocale("/english")).toBe("/english");
    expect(getLocale("/en/editor")).toBe("en");
  });
  it("정적 렌더링 간 번역 인스턴스를 격리하고 즉시 준비한다", () => {
    const en = createI18n("en");
    const ko = createI18n("ko");
    expect(en.isInitialized).toBe(true);
    expect(en.t("경계 데이터")).toBe("Boundary data");
    expect(ko.t("경계 데이터")).toBe("경계 데이터");
    expect(en.t("국가 선택: {{v0}}", { v0: "South Korea" })).toBe(
      "Select country: South Korea",
    );
    expect(en.t("도형을 보내고, 편집 결과를 돌려받으세요")).toBe(
      "Send shapes. Receive edited results.",
    );
  });
  it.each([
    [koUi, enUi],
    [koDocs, enDocs],
    [koExamples, enExamples],
  ])("번역 키와 보간 인자가 두 언어에서 일치한다", (ko, en) => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(ko).sort());
    for (const [key, source] of Object.entries(ko)) {
      const target = (en as Record<string, string>)[key];
      expect(target.trim(), key).not.toBe("");
      expect((target.match(/\{\{[^}]+\}\}/g) ?? []).sort(), key).toEqual(
        (source.match(/\{\{[^}]+\}\}/g) ?? []).sort(),
      );
    }
  });
  it("복사용 코드의 주석과 주소만 지역화하고 예제 데이터 이름은 보존한다", () => {
    const input =
      '// 남서쪽 꼭짓점\nconst name = "경복궁 예제 권역";\nconst url = "https://maps-editor.pages.dev/editor/";';
    const en = createI18n("en");
    const result = localizeExample(input, en.t.bind(en), "en");
    expect(result).toContain("// Southwest vertex");
    expect(result).toContain('"경복궁 예제 권역"');
    expect(result).toContain("/en/editor/");
  });
});
