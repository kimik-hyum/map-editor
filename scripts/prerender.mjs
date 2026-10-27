import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = resolve(fileURLToPath(import.meta.url), "../..");
const template = await readFile(resolve(rootDir, "dist/index.html"), "utf8");
const { render, getPageMetadata } = await import(
  resolve(rootDir, "dist-ssr/entry-server.js")
);
const documents = [
  "",
  "editing",
  "integration",
  "authentication",
  "self-hosting",
  "self-hosting/boundaries",
  "about",
];
const shells = ["demo", "editor", "screen", "auth/callback"];
const escapeHtml = (value) =>
  value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");

async function writeRoute(route, html) {
  const dir = resolve(rootDir, "dist", route);
  await mkdir(dir, { recursive: true });
  await writeFile(resolve(dir, "index.html"), html);
}
function shell(route) {
  // Root-relative Vite assets also work when the host serves the SPA fallback
  // for a deep language URL without a trailing slash.
  const meta = getPageMetadata(`/${route}`);
  const head = meta.elements
    .map(({ tag, attributes }) => {
      const serialized = Object.entries(attributes)
        .map(([name, value]) => `${name}="${escapeHtml(value)}"`)
        .join(" ");
      return `<${tag} ${serialized} data-page-metadata />`;
    })
    .join("\n");
  return template
    .replace('<html lang="ko">', `<html lang="${meta.locale}">`)
    .replace(
      /<!--page-metadata:start-->[\s\S]*?<!--page-metadata:end-->/,
      `<title>${escapeHtml(meta.title)}</title>\n${head}`,
    );
}

for (const locale of ["ko", "en"]) {
  for (const path of [...documents, ...shells]) {
    const route = `${locale}${path ? `/${path}` : ""}`;
    const urlPath = `/${route}${path ? "" : "/"}`;
    let html = shell(route);
    if (documents.includes(path)) {
      html = html.replace(
        '<div id="root"></div>',
        `<div id="root">${render(urlPath)}</div>`,
      );
    }
    await writeRoute(route, html);
  }
}
// Old bookmarks keep query strings and fragments through the client redirect.
// Cloudflare also performs permanent language redirects before serving HTML.
for (const route of [...documents, ...shells]) await writeRoute(route, shell(route));
await rm(resolve(rootDir, "dist-ssr"), { force: true, recursive: true });
