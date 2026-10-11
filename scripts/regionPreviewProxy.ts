import { readFileSync } from "node:fs";
import type { ProxyOptions } from "vite";

// 명시적으로 켠 로컬 미리보기에서만 서버 측 개발 자격 증명을 사용합니다.
// 이 파일은 Vite 설정에서만 import하며 브라우저 번들에 포함하지 않습니다.
export function regionPreviewProxy(
  keyFile: string | undefined,
): Record<string, ProxyOptions> {
  if (!keyFile) return {};
  const key = readFileSync(keyFile, "utf8")
    .match(/^MAPS_EDITOR_DEV_KEY=(.+)$/m)?.[1]
    ?.trim();
  if (!key || !/^maps_dev_[A-Za-z0-9_-]{43}$/.test(key))
    throw new Error("경계 미리보기 서버 설정을 확인하세요.");
  return {
    "^/region-preview/functions/v1/(regions|region-search)$": {
      target: "https://maps-editor.pages.dev",
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/region-preview\/functions\/v1/, "/api"),
      // 개발 키 프록시가 외부 터널의 국가 제한 우회 경로가 되지 않게 합니다.
      bypass(request, response) {
        const host = request.headers.host ?? "";
        const address = request.socket.remoteAddress ?? "";
        if (
          !["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(address) ||
          !/^(127\.0\.0\.1|localhost):\d+$/.test(host) ||
          request.headers["cf-connecting-ip"] ||
          request.headers["x-forwarded-for"]
        ) {
          if (response) {
            response.statusCode = 403;
            response.setHeader("Content-Type", "application/json");
            response.end(
              JSON.stringify({
                error: "개발 경계 프록시는 로컬에서만 이용할 수 있습니다.",
              }),
            );
          }
          return false;
        }
      },
      configure(proxy) {
        proxy.on("proxyReq", (request) => {
          request.setHeader("Authorization", `Bearer ${key}`);
          request.setHeader("Origin", "http://localhost:4173");
          request.removeHeader("cookie");
        });
        proxy.on("proxyRes", (response) => {
          response.headers["cache-control"] = "private, no-store";
        });
      },
    },
  };
}
