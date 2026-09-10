import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DocsCodeBlock } from "./DocsCodeBlock";

describe("DocsCodeBlock", () => {
  it("제목, 줄 번호와 하이라이트된 코드를 렌더링한다", () => {
    const markup = renderToStaticMarkup(
      createElement(DocsCodeBlock, {
        code: 'const message = { type: "MAP_EDITOR_READY" };',
        language: "typescript",
        title: "부모창 예제",
      }),
    );

    expect(markup).toContain("부모창 예제");
    expect(markup).toContain("코드 복사");
    expect(markup).toContain("MAP_EDITOR_READY");
    expect(markup).toContain(">1</span>");
  });
});
