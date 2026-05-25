import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = resolve(fileURLToPath(import.meta.url), "../..");
const templatePath = resolve(rootDir, "dist/index.html");
const serverEntryPath = resolve(rootDir, "dist-ssr/entry-server.js");

const template = await readFile(templatePath, "utf8");
const { render } = await import(serverEntryPath);
const docsHtml = render("/");
const nestedShell = template.replaceAll("./assets/", "../assets/");

await writeFile(
  templatePath,
  template.replace('<div id="root"></div>', `<div id="root">${docsHtml}</div>`),
);

for (const route of ["demo", "editor"]) {
  const routeDir = resolve(rootDir, "dist", route);
  await mkdir(routeDir, { recursive: true });
  await writeFile(resolve(routeDir, "index.html"), nestedShell);
}

await rm(resolve(rootDir, "dist-ssr"), { force: true, recursive: true });
