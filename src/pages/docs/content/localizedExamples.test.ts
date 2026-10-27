import { describe, expect, it } from "vitest";
import { parseConfigFileTextToJson, transpileModule, ModuleKind } from "typescript";
import { editorSceneInputSchema } from "@/pages/editor/messaging/editorSceneSchema";
import { getSampleEditorScene } from "@/pages/demo/fixtures/sampleEditorScene";
import { createI18n } from "@/shared/i18n/i18n";
import { localizeExample } from "@/shared/i18n/localizeExample";
import { getDocsExample } from "./localizedExamples";
import { getMinimalServiceExample } from "./parentIntegrationExamples";
import { getRoundtripExamples } from "./roundtripExamples";

for (const locale of ["ko", "en"] as const) {
  describe(`${locale} 지도 예제`, () => {
    it("데모·문서는 해당 국가의 좌표를 실제 편집기 계약으로 제공한다", () => {
      for (const scene of [
        getSampleEditorScene(locale),
        getDocsExample(locale).scene,
      ]) {
        expect(editorSceneInputSchema.safeParse(scene).success).toBe(true);
        for (const feature of scene.features) {
          if (feature.geometry.type !== "Polygon") continue;
          for (const [longitude, latitude] of feature.geometry.coordinates[0]) {
            expect(longitude).toBeGreaterThan(locale === "en" ? -75 : 126);
            expect(longitude).toBeLessThan(locale === "en" ? -73 : 128);
            expect(latitude).toBeGreaterThan(locale === "en" ? 40 : 37);
            expect(latitude).toBeLessThan(locale === "en" ? 41 : 38);
          }
        }
      }
    });
    it("JSONC·복사 데이터·입출력 예제는 동일한 지역과 데이터를 사용한다", () => {
      const example = getDocsExample(locale);
      const i18n = createI18n(locale);
      const explained = localizeExample(example.explanation, i18n.t.bind(i18n), locale);
      const parsed = parseConfigFileTextToJson("example.jsonc", explained);
      expect(parsed.error).toBeUndefined();
      expect(parsed.config).toEqual(example.scene);
      const messages = getRoundtripExamples(locale);
      expect(JSON.parse(messages.initMessageExample).scene).toEqual(example.scene);
      expect(JSON.parse(messages.submitMessageExample).scene).not.toEqual(
        example.scene,
      );
      expect(
        editorSceneInputSchema.safeParse(messages.roundtripOutputScene).success,
      ).toBe(true);
      expect(messages.roundtripOutputScene.features.slice(1)).toEqual(
        example.scene.features.slice(1),
      );
      for (const source of [example.source, getMinimalServiceExample(locale)]) {
        const code = localizeExample(source, i18n.t.bind(i18n), locale);
        const result = transpileModule(code, {
          compilerOptions: { module: ModuleKind.ESNext },
          reportDiagnostics: true,
        });
        expect(result.diagnostics).toEqual([]);
        expect(code).toContain(locale === "en" ? "-73.978" : "126.97");
        if (locale === "en") expect(code).not.toContain("126.97");
      }
    });
  });
}
