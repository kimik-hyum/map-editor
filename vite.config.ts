import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import { regionPreviewProxy } from "./scripts/regionPreviewProxy";

export default defineConfig(({ command, mode }) => ({
  base: "/",
  plugins: [tailwindcss(), react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    proxy:
      command === "serve" && mode === "boundary-preview"
        ? regionPreviewProxy(
            loadEnv(mode, process.cwd(), "REGION_PREVIEW_").REGION_PREVIEW_DEV_KEY_FILE,
          )
        : {},
    // cloudflared 임시 터널(공유용)을 dev 서버에서 허용합니다. 앞에 점을 붙이면 하위 도메인 전체를 허용합니다.
    allowedHosts: [".trycloudflare.com"],
  },
  preview: {
    allowedHosts: [".trycloudflare.com"],
  },
}));
