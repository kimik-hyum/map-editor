import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = resolve(fileURLToPath(import.meta.url), "../..");
const templatePath = resolve(rootDir, "dist/index.html");
const serverEntryPath = resolve(rootDir, "dist-ssr/entry-server.js");

const template = await readFile(templatePath, "utf8");
const { render } = await import(serverEntryPath);
const nestedShell = template.replaceAll("./assets/", "../assets/");

for (const route of ["/", "/screen", "/editing", "/integration"]) {
  const routeTemplate = route === "/" ? template : nestedShell;
  const routeHtml = routeTemplate.replace(
    '<div id="root"></div>',
    `<div id="root">${render(route)}</div>`,
  );

  if (route === "/") {
    await writeFile(templatePath, routeHtml);
    continue;
  }

  const routeDir = resolve(rootDir, "dist", route.slice(1));
  await mkdir(routeDir, { recursive: true });
  await writeFile(resolve(routeDir, "index.html"), routeHtml);
}

for (const route of ["demo", "editor", "auth/callback"]) {
  // 중첩 callback 경로에서도 JS/CSS가 루트 assets를 가리켜야 합니다.
  const assetPrefix = "../".repeat(route.split("/").length);
  const nestedShell = template.replaceAll("./assets/", `${assetPrefix}assets/`);
  const routeDir = resolve(rootDir, "dist", route);
  await mkdir(routeDir, { recursive: true });
  await writeFile(resolve(routeDir, "index.html"), nestedShell);
}

await rm(resolve(rootDir, "dist-ssr"), { force: true, recursive: true });
