import { expect, type BrowserContext, type Page } from "@playwright/test";

// 테스트 브라우저에 전달하는 Vite 모듈만 계측합니다. 앱/상용 번들에는 전역 계측값을 넣지 않습니다.
export async function installGeometryOverlapProbe(context: BrowserContext) {
  await context.route("**/geometry-ops/model/booleanOps.ts*", async (route) => {
    const response = await route.fetch();
    expect(response.ok(), "교집합 계측 대상 모듈을 불러와야 합니다").toBe(true);
    const source = await response.text();
    const marker = "return overlapAreaSquareMeters(a, b) > minArea;";
    expect(source).toContain(marker);
    await route.fulfill({
      response,
      body: `globalThis.__geometryOverlapChecks ??= 0;\n${source.replace(
        marker,
        `globalThis.__geometryOverlapChecks = (globalThis.__geometryOverlapChecks ?? 0) + 1;\n${marker}`,
      )}`,
    });
  });
}

export async function readGeometryOverlapChecks(page: Page) {
  const checks = await page.evaluate(
    () =>
      (globalThis as typeof globalThis & { __geometryOverlapChecks?: number })
        .__geometryOverlapChecks,
  );
  // 계측되지 않은 모듈/새 문서를 실제 호출 0회와 혼동하지 않습니다.
  expect(checks, `교집합 계측 모듈이 실행되지 않았습니다: ${page.url()}`).toBeDefined();
  return checks as number;
}
