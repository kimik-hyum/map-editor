import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(import.meta.url), "../..");
const routes = [
  ["", "내 지도에 연결하는 폴리곤 편집기"],
  ["integration", "연동 인터페이스"],
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

for (const [route, heading] of routes) {
  const file = resolve(root, "dist", route, "index.html");
  const html = await readFile(file, "utf8");
  if (heading) {
    assert(
      html.includes(heading) && html.includes("<h1"),
      `${route}: prerendered document`,
    );
    assert(
      html.includes("<title>") && /<title>[^<]*Termia/.test(html),
      `${route}: branded document title`,
    );
    const footer = html.match(/<footer\b[^>]*>[\s\S]*?<\/footer>/)?.[0];
    assert(footer?.includes('href="/about"'), `${route}: introduction in footer`);
    for (const navigation of html.matchAll(
      /<(?:nav|aside)\b[^>]*aria-label="(?:Primary navigation|사용·연동 안내|내재화 안내)"[^>]*>[\s\S]*?<\/(?:nav|aside)>/g,
    )) {
      assert(
        !navigation[0].includes('href="/about"'),
        `${route}: introduction stays out of primary and side navigation`,
      );
    }
    if (route !== "about") {
      const selfHosted = route === "authentication" || route.startsWith("self-hosting");
      const label = selfHosted ? "내재화 안내" : "사용·연동 안내";
      const nav = html.match(
        new RegExp(`<nav\\b[^>]*aria-label="${label}"[^>]*>[\\s\\S]*?<\\/nav>`),
      )?.[0];
      assert(nav, `${route}: audience-specific contents`);
      for (const [, anchor] of nav.matchAll(/href="#([^"]+)"/g)) {
        assert(html.includes(`id="${anchor}"`), `${route}: section ${anchor} exists`);
      }
      if (!selfHosted) {
        assert(
          !nav.includes('href="/authentication"') &&
            !nav.includes('href="/self-hosting/boundaries"'),
          `${route}: usage contents exclude implementation settings`,
        );
      }
    }
  } else {
    assert(html.includes('<div id="root"></div>'), `${route}: empty SPA shell`);
  }
  const assets = [...html.matchAll(/(?:src|href)="([^"]*assets\/[^"]+)"/g)];
  assert(assets.length >= 2, `${route}: JS and CSS references`);
  for (const [, asset] of assets) await access(resolve(dirname(file), asset));
  for (const [, asset] of html.matchAll(/(?:src|href)="(\/brand\/[^"]+)"/g)) {
    await access(resolve(root, "dist", asset.slice(1)));
  }
  console.log(`/${route}: HTML and relative assets OK`);
}

for (const name of ["termia-logo.png", "termia-symbol.png"]) {
  const png = await readFile(resolve(root, "dist/brand", name));
  assert(
    png.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
    `${name}: PNG signature`,
  );
  assert.equal(png[25], 6, `${name}: RGBA image`);
}
