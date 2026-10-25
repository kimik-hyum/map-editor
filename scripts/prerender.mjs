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
function shell() {
  // Root-relative Vite assets also work when the host serves the SPA fallback
  // for a deep language URL without a trailing slash.
  return template;
}

for (const locale of ["ko", "en"]) {
  for (const path of [...documents, ...shells]) {
    const route = `${locale}${path ? `/${path}` : ""}`;
    const urlPath = `/${route}${path ? "" : "/"}`;
    const meta = getPageMetadata(urlPath);
    let html = shell(route)
      .replace('<html lang="ko">', `<html lang="${locale}">`)
      .replace(
        "<title>Maps Editor</title>",
        `<title>${escapeHtml(meta.title)}</title>`,
      );
    if (documents.includes(path)) {
      html = html.replace(
        '<div id="root"></div>',
        `<div id="root">${render(urlPath)}</div>`,
      );
      const canonical = `https://maps-editor.pages.dev${urlPath.replace(/\/?$/, "/")}`;
      const alternates = ["ko", "en"]
        .map(
          (lang) =>
            `<link rel="alternate" hreflang="${lang}" href="https://maps-editor.pages.dev/${lang}/${path}${path ? "/" : ""}" />`,
        )
        .join("");
      html = html.replace(
        "</head>",
        `<meta name="description" content="${escapeHtml(meta.description)}" /><link rel="canonical" href="${canonical}" />${alternates}</head>`,
      );
    }
    await writeRoute(route, html);
  }
}
// Old bookmarks keep query strings and fragments through the client redirect.
// Cloudflare also performs permanent language redirects before serving HTML.
for (const route of [...documents, ...shells]) await writeRoute(route, shell(route));
await rm(resolve(rootDir, "dist-ssr"), { force: true, recursive: true });
