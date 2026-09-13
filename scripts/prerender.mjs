import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = resolve(fileURLToPath(import.meta.url), "../..");
const templatePath = resolve(rootDir, "dist/index.html");
const serverEntryPath = resolve(rootDir, "dist-ssr/entry-server.js");

const template = await readFile(templatePath, "utf8");
const { render } = await import(serverEntryPath);
const titles = {
  "/": "내 지도에 연결하는 폴리곤 편집기 | Termia",
  "/authentication": "Google·Supabase 구성 (선택) | Termia",
  "/editing": "편집 도구 안내 | Termia",
  "/integration": "연동 인터페이스 | Termia",
  "/about": "Termia 소개 · 경계를 그리고, 공간에 가치를 더하다",
  "/self-hosting": "직접 운영·커스텀 | Termia",
  "/self-hosting/boundaries": "경계 데이터 어댑터 | Termia",
};

for (const route of Object.keys(titles)) {
  const depth = route.split("/").filter(Boolean).length;
  const routeTemplate =
    depth === 0
      ? template
      : template.replaceAll("./assets/", `${"../".repeat(depth)}assets/`);
  let routeHtml = routeTemplate.replace(
    '<div id="root"></div>',
    `<div id="root">${render(route)}</div>`,
  );
  routeHtml = routeHtml.replace(
    "<title>Maps Editor</title>",
    `<title>${titles[route]}</title>`,
  );
  if (route === "/about") {
    routeHtml = routeHtml.replace(
      "</head>",
      '<meta name="description" content="경계를 그리고, 공간에 가치를 더하다. 지도 위에서 필요한 권역을 만드는 Termia의 이름과 브랜드 이야기를 만나보세요." /></head>',
    );
  }

  if (route === "/") {
    await writeFile(templatePath, routeHtml);
    continue;
  }

  const routeDir = resolve(rootDir, "dist", route.slice(1));
  await mkdir(routeDir, { recursive: true });
  await writeFile(resolve(routeDir, "index.html"), routeHtml);
}

for (const route of ["demo", "editor", "screen", "auth/callback"]) {
  // 중첩 callback 경로에서도 JS/CSS가 루트 assets를 가리켜야 합니다.
  const assetPrefix = "../".repeat(route.split("/").length);
  const nestedShell = template.replaceAll("./assets/", `${assetPrefix}assets/`);
  const routeDir = resolve(rootDir, "dist", route);
  await mkdir(routeDir, { recursive: true });
  await writeFile(resolve(routeDir, "index.html"), nestedShell);
}

await rm(resolve(rootDir, "dist-ssr"), { force: true, recursive: true });
