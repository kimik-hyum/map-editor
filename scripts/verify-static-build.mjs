import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(import.meta.url), "../..");
const routes = [
  ["", "도형을 보내고, 편집 결과를 돌려받으세요"],
  ["integration", "편집 창 연동하기"],
  ["authentication", "Google·Supabase 구성 (선택)"],
  ["editing", "편집 도구 안내"],
  ["about", "경계를 그리고,"],
  ["self-hosting", "직접 운영·커스텀"],
  ["self-hosting/boundaries", "경계 데이터 어댑터"],
  ["demo", null],
  ["editor", null],
  ["screen", null],
  ["auth/callback", null],
];

const enDocs = JSON.parse(
  await readFile(resolve(root, "src/shared/i18n/locales/en/docs.json"), "utf8"),
);
const enUi = JSON.parse(
  await readFile(resolve(root, "src/shared/i18n/locales/en/ui.json"), "utf8"),
);
for (const locale of ["ko", "en"]) {
  for (const [page, sourceHeading] of routes) {
    const route = `${locale}${page ? `/${page}` : ""}`;
    const translate = (key) =>
      locale === "ko" ? key : (enDocs[key] ?? enUi[key] ?? key);
    const heading = sourceHeading ? translate(sourceHeading) : null;
    const file = resolve(root, "dist", route, "index.html");
    const html = await readFile(file, "utf8");
    assert(html.includes(`<html lang="${locale}">`), `${route}: HTML language`);
    if (heading) {
      assert(html.includes(`hreflang="${locale}"`), `${route}: language alternatives`);
      assert(
        html.includes(`rel="canonical" href="https://maps-editor.pages.dev/${route}/"`),
        `${route}: canonical URL matches the static host directory`,
      );
      assert(
        html.includes(heading) && html.includes("<h1"),
        `${route}: prerendered document`,
      );
      assert(
        html.includes("<title>") && /<title>[^<]*Termia/.test(html),
        `${route}: branded document title`,
      );
      const footer = html.match(/<footer\b[^>]*>[\s\S]*?<\/footer>/)?.[0];
      assert(
        footer?.includes(`href="/${locale}/about"`),
        `${route}: introduction in footer`,
      );
      for (const navigation of html.matchAll(
        /<(?:nav|aside)\b[^>]*aria-label="(?:Primary navigation|사용·연동 안내|직접 운영 안내)"[^>]*>[\s\S]*?<\/(?:nav|aside)>/g,
      )) {
        assert(
          !navigation[0].includes(`href="/${locale}/about"`),
          `${route}: introduction stays out of primary and side navigation`,
        );
      }
      if (page !== "about") {
        const selfHosted = page === "authentication" || page.startsWith("self-hosting");
        const label = translate(selfHosted ? "직접 운영 안내" : "사용·연동 안내");
        const nav = html.match(
          new RegExp(`<nav\\b[^>]*aria-label="${label}"[^>]*>[\\s\\S]*?<\\/nav>`),
        )?.[0];
        assert(nav, `${route}: audience-specific contents`);
        for (const [, anchor] of nav.matchAll(/href="#([^"]+)"/g)) {
          assert(html.includes(`id="${anchor}"`), `${route}: section ${anchor} exists`);
        }
        if (!selfHosted) {
          assert(
            !nav.includes(`href="/${locale}/authentication"`) &&
              !nav.includes(`href="/${locale}/self-hosting/boundaries"`),
            `${route}: usage contents exclude implementation settings`,
          );
        }
      }
    } else {
      assert(html.includes('<div id="root"></div>'), `${route}: empty SPA shell`);
    }
    const assets = [...html.matchAll(/(?:src|href)="([^"]*assets\/[^"]+)"/g)];
    assert(assets.length >= 2, `${route}: JS and CSS references`);
    for (const [, asset] of assets)
      await access(
        asset.startsWith("/")
          ? resolve(root, "dist", asset.slice(1))
          : resolve(dirname(file), asset),
      );
    for (const [, asset] of html.matchAll(/(?:src|href)="(\/brand\/[^"]+)"/g)) {
      await access(resolve(root, "dist", asset.slice(1)));
    }
    console.log(`/${route}: HTML and relative assets OK`);
  }
}
for (const [page] of routes) {
  const html = await readFile(resolve(root, "dist", page, "index.html"), "utf8");
  assert(html.includes('<div id="root"></div>'), `${page}: legacy redirect shell`);
}
for (const name of ["termia-logo.png", "termia-symbol.png"]) {
  const png = await readFile(resolve(root, "dist/brand", name));
  assert(
    png.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
    `${name}: PNG signature`,
  );
  assert.equal(png[25], 6, `${name}: RGBA image`);
}
