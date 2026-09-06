import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(import.meta.url), "../..");
const routes = [
  ["", "빠른 시작"],
  ["integration", "부모 창 연동"],
  ["authentication", "경계 데이터·인증"],
  ["editing", "편집 동작"],
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
  } else {
    assert(html.includes('<div id="root"></div>'), `${route}: empty SPA shell`);
  }
  const assets = [...html.matchAll(/(?:src|href)="([^"]*assets\/[^"]+)"/g)];
  assert(assets.length >= 2, `${route}: JS and CSS references`);
  for (const [, asset] of assets) await access(resolve(dirname(file), asset));
  console.log(`/${route}: HTML and relative assets OK`);
}
