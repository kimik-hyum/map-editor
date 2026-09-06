import ts from "typescript";
import { describe, expect, it } from "vitest";
import {
  messageSchemaExample,
  parentHostExample,
  resultUsageExample,
  sceneInputExample,
} from "./parentIntegrationExamples";

function expectValidTypeScript(source: string) {
  const result = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
    reportDiagnostics: true,
  });
  const syntaxErrors = result.diagnostics?.filter(
    (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
  );
  expect(syntaxErrors).toEqual([]);
}

describe("부모창 연동 문서 예제", () => {
  it("입력 scene 예시는 유효한 JSON이다", () => {
    expect(JSON.parse(sceneInputExample)).toMatchObject({
      version: 2,
      features: expect.any(Array),
    });
  });

  it("TypeScript 예제는 문법 오류 없이 변환된다", () => {
    expectValidTypeScript(messageSchemaExample);
    expectValidTypeScript(parentHostExample);
    expectValidTypeScript(resultUsageExample);
  });

  it("부모 예제는 source, origin, session을 검증하고 정확한 origin으로 전송한다", () => {
    expect(parentHostExample).toContain("event.source !== targetWindow");
    expect(parentHostExample).toContain("event.origin !== editorOrigin");
    expect(parentHostExample).toContain("completion.data.sessionId !== sessionId");
    expect(parentHostExample).toContain("scene: initialScene");
    expect(parentHostExample).toContain("structuredClone(options.getScene())");
    expect(parentHostExample).toContain("editorOrigin,");
    expect(parentHostExample).not.toContain('postMessage("*")');
  });
});
